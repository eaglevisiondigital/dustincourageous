#!/usr/bin/env python3
"""Disposable Supabase Auth/PostgREST integration; fixed loopback/container only.
Never takes a hosted URL/key. Credentials stay in memory, never in logs/artifacts.
"""
import json,os,secrets,subprocess,sys,time,uuid
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
ROOT=Path(__file__).resolve().parents[2]
BASE='http://127.0.0.1:55431'
checks=0

def sql(query):
 env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
 env['PGOPTIONS']='-c dc.recovery_mode=isolated'
 r=subprocess.run([str(ROOT/'supabase/recovery/local-admin-psql.sh'),'-X','-qAt','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True,env=env,timeout=60)
 if r.returncode:raise AssertionError('Isolated fixture SQL failed: '+r.stderr[-2000:])
 return r.stdout.strip()

def check(ok,label):
 global checks
 if not ok:raise AssertionError(label)
 checks+=1
 print('PASS: '+label,flush=True)

status=subprocess.run(['npx','--yes','supabase@2.118.0','status','--workdir',str(ROOT/'supabase/recovery/local'),'--output','json'],capture_output=True,text=True,check=True,timeout=60)
config=json.loads(status.stdout)
assert config['API_URL'].rstrip('/')==BASE,'Refusing non-isolated API'
anon=config['ANON_KEY'];service=config['SERVICE_ROLE_KEY']

def req(path,method='GET',body=None,token=None,admin=False,headers=None):
 h={'apikey':service if admin else anon,'Authorization':'Bearer '+(token or (service if admin else anon)),'Content-Type':'application/json'}
 h.update(headers or {})
 r=Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,method=method,headers=h)
 try:
  with urlopen(r,timeout=25) as res:data=res.read();code=res.status
 except HTTPError as e:code=e.code;data=e.read()
 return code,json.loads(data) if data else None

def good(path,method='GET',body=None,token=None,admin=False,headers=None):
 code,data=req(path,method,body,token,admin,headers)
 # Errors contain no request body/session/token; keep output to code and message.
 if not 200<=code<300:raise AssertionError(f'{method} {path.split("?")[0]}: HTTP {code}, {data.get("code") if isinstance(data,dict) else None}: {data.get("message") if isinstance(data,dict) else None}')
 return data

def rpc(name,args,token):return good('/rest/v1/rpc/'+name,'POST',args,token)
def denied(path,method,body,token,label):
 code,data=req(path,method,body,token)
 check(code in (400,401,403,404) and isinstance(data,dict) and data.get('code') in ('42501','P0001','PGRST202','PGRST106'),label)

def signup(label):
 password=secrets.token_urlsafe(30)+'aA7!';email='dc-acl-'+uuid.uuid4().hex+'@example.invalid'
 data=good('/auth/v1/signup','POST',{'email':email,'password':password})
 check(bool(data.get('access_token')),'isolated Auth signup '+label)
 signed=good('/auth/v1/token?grant_type=password','POST',{'email':email,'password':password})
 check(signed['user']['id']==data['user']['id'],'password sign-in '+label)
 return {'id':data['user']['id'],'email':email,'token':signed['access_token'],'password':password}

# Schema-cache refresh is needed because the recovery bootstrap uses raw SQL.
sql("NOTIFY pgrst, 'reload schema';")
for attempt in range(20):
 code,_=req('/rest/v1/households?select=id&limit=0')
 if code==401:break
 time.sleep(.5)
else:raise AssertionError('PostgREST schema/anonymous denial not ready')
# No emails are sent: this disposable CLI instance explicitly autoconfirms signup.
a,b,invitee,admin=[signup(label) for label in ('A','B','invitee','admin')]
sql("INSERT INTO public.consent_policies(consent_key,title,description,current_policy_version) VALUES ('child_participation','Synthetic','Isolated test only','test-1') ON CONFLICT DO NOTHING; INSERT INTO public.app_admins(user_id,role) VALUES ('"+admin['id']+"','super_admin');")
for user in (a,b):
 user['home']=rpc('create_household_with_consent',{'p_name':'Synthetic HTTP family','p_timezone':'UTC'},user['token'])
 user['child']=rpc('create_child_with_consent',{'p_household_id':user['home'],'p_display_name':'Synthetic child'},user['token'])
check(a['home']!=b['home'] and a['child']!=b['child'],'independent household/child onboarding')
for relation,idcol,value in [('households','id',b['home']),('child_profiles','id',b['child'])]:
 check(good('/rest/v1/'+relation+'?'+idcol+'=eq.'+value,token=a['token'])==[],'cross-household '+relation+' read denied')
 check(good('/rest/v1/'+relation+'?'+idcol+'=eq.'+value,'PATCH',{'name':'Denied'} if relation=='households' else {'display_name':'Denied'},a['token'],headers={'Prefer':'return=representation'})==[],'cross-household '+relation+' update denied')
check(len(good('/rest/v1/household_consents?household_id=eq.'+a['home'],token=a['token']))==2,'onboarding consents created and readable')
check(len(good('/rest/v1/household_members?household_id=eq.'+a['home'],token=a['token']))==1,'owner membership visible')
check(len(good('/rest/v1/child_profiles?id=eq.'+a['child'],'PATCH',{'display_name':'Synthetic edited'},a['token'],headers={'Prefer':'return=representation'}))==1,'own child edit succeeds')
# Exercise all approved table/view reads through PostgREST with real guardian AND admin JWTs.
policy=json.loads((ROOT/'supabase/security/proposed-policy.json').read_text())
for user,label in ((a,'guardian'),(admin,'admin')):
 for o in policy['objects']:
  if o['kind'] in ('r','v') and 'SELECT' in o['authenticated']:
   good('/rest/v1/'+o['object'].split('.')[1]+'?select=*&limit=1',token=user['token'])
 check(True,label+' all approved table/view reads')
# Embeddings that cannot be inferred from direct .from calls.
for query in ['orders?select=id,fulfillments(id)&limit=1','dc_content_blueprints?select=id,dc_blueprint_requirements(id)&limit=1','child_challenge_progress?select=id,child_profiles!inner(display_name,household_id,status),challenges(title)&limit=1']:
 good('/rest/v1/'+query,token=admin['token'])
check(True,'PostgREST embedded relations')
rpc('set_guardian_pin',{'p_household_id':a['home'],'p_pin':'593827'},a['token'])
check(rpc('guardian_pin_status',{'p_household_id':a['home']},a['token'])[0]['configured'],'PIN setup/status')
for _ in range(5):check(rpc('create_guardian_unlock_session',{'p_household_id':a['home'],'p_pin':'000000'},a['token']) is None,'failed PIN HTTP request returns denial')
check(rpc('create_guardian_unlock_session',{'p_household_id':a['home'],'p_pin':'593827'},a['token']) is None,'cooldown persists across HTTP transactions')
# Cooldown reset is synthetic fixture preparation, never a production operation.
sql("UPDATE private.household_guardian_security SET failed_attempts=0,locked_until=NULL WHERE household_id='"+a['home']+"';")
token=rpc('create_guardian_unlock_session',{'p_household_id':a['home'],'p_pin':'593827'},a['token']);check(bool(token),'guardian unlock HTTP token issued')
rpc('revoke_guardian_unlock_sessions',{'p_household_id':a['home']},a['token'])
check(sql("SELECT count(*) FROM private.guardian_unlock_sessions WHERE household_id='"+a['home']+"' AND revoked_at IS NULL;")=='0','guardian HTTP revocation persisted')
inv=rpc('create_household_invitation',{'p_household_id':a['home'],'p_email':invitee['email'],'p_role':'guardian'},a['token'])[0]
rpc('accept_household_invitation',{'p_invitation_id':inv['invitation_id'],'p_token':inv['invitation_token']},invitee['token'])
check(bool(good('/rest/v1/household_members?household_id=eq.'+a['home'],token=invitee['token'])),'invitation acceptance and membership')
request=rpc('request_data_privacy_action',{'p_household_id':a['home'],'p_request_type':'export_child','p_child_profile_id':a['child']},a['token'])
check(bool(good('/rest/v1/data_privacy_requests?id=eq.'+request,token=a['token'])),'privacy request creation/read')
check(good('/rest/v1/data_privacy_requests?id=eq.'+request,token=b['token'])==[],'cross-household privacy request denied')
rpc('privacy_export_payload',{'p_request_id':request},a['token']);check(True,'authenticated export payload RPC')
denied('/rest/v1/rpc/privacy_export_payload','POST',{'p_request_id':request},b['token'],'cross-household export RPC denied')
ticket=good('/rest/v1/support_tickets','POST',{'id':str(uuid.uuid4()),'user_id':a['id'],'household_id':a['home'],'subject':'Synthetic HTTP','message':'Isolated fixture'},a['token'],headers={'Prefer':'return=representation'})
check(isinstance(ticket[0]['ticket_number'],int),'identity INSERT works without any sequence grant')
for table,body in [('app_admins',{'user_id':a['id'],'role':'super_admin'}),('household_entitlement_grants',{'household_id':a['home'],'entitlement_key':'digital_books','source_type':'manual'}),('xp_ledger',{'child_profile_id':a['child'],'points':999}),('badge_awards',{'child_profile_id':a['child'],'badge_id':str(uuid.uuid4())})]:
 denied('/rest/v1/'+table,'POST',body,a['token'],'direct '+table+' mutation denied')
denied('/rest/v1/rpc/admin_get_production_launch_gate','POST',{},a['token'],'guardian admin gate denied')
check(bool(rpc('admin_get_production_launch_gate',{},admin['token'])),'authorized admin launch gate')
# New admin content stays draft. This is synthetic data, not creative approval.
newbook=rpc('admin_create_book',{'p_book_number':-999,'p_title':'Synthetic HTTP draft','p_slug':'http-'+uuid.uuid4().hex},admin['token'])
check(bool(newbook),'authorized admin draft creation')
# A fixture-only published digital book with synthetic manifest; no production assets/content.
book=str(uuid.uuid4());content=str(uuid.uuid4())
manifest={'revision':'test-1','pages':[{'path':book+'/test-1/page1.png','alt':'Synthetic page one'},{'path':book+'/test-1/page2.png','alt':'Synthetic page two'}]}
manifest_sql=json.dumps(manifest).replace("'","''")
sql(f"""BEGIN; SET LOCAL session_replication_role=replica;
 INSERT INTO public.books(id,title,slug,status,completion_xp,adventure_completion_xp) VALUES('{book}','Synthetic HTTP book','http-{book}','published',10,25);
 INSERT INTO private.digital_book_manifests(book_id,manifest) VALUES('{book}','{manifest_sql}'::jsonb);
 UPDATE public.books SET metadata=jsonb_build_object('digital_reader',jsonb_build_object('revision','test-1','sha256',encode(extensions.digest('{manifest_sql}'::jsonb::text,'sha256'),'hex'))) WHERE id='{book}';
 INSERT INTO public.dc_content_reviews(entity_type,entity_id,requested_by,status,content_fingerprint) VALUES('book','{book}','{admin['id']}','approved',private.dc_entity_fingerprint('book','{book}'));
 INSERT INTO public.entitlement_definitions(entitlement_key,name) VALUES('book_companions','Synthetic test') ON CONFLICT DO NOTHING;
 INSERT INTO public.household_entitlement_grants(household_id,entitlement_key,source_type) VALUES('{a['home']}','digital_books','manual'),('{a['home']}','book_companions','manual');
 INSERT INTO public.content_items(id,title,slug,content_type,status,completion_xp) VALUES('{content}','Synthetic activity','http-{content}','activity','published',7);
 INSERT INTO public.book_content_links(book_id,content_item_id,is_required) VALUES('{book}','{content}',true);
 COMMIT;""")
ready=rpc('get_digital_book',{'p_child_profile_id':a['child'],'p_book_id':book},a['token'])
check(ready['availability']=='ready' and len(ready['pages'])==2,'released entitled digital book HTTP read')
denied('/rest/v1/rpc/get_digital_book','POST',{'p_child_profile_id':a['child'],'p_book_id':book},b['token'],'foreign child digital book denied')
check(rpc('save_digital_book_position',{'p_child_profile_id':a['child'],'p_book_id':book,'p_revision':'test-1','p_page_number':2},a['token'])==2,'reading position RPC')
check(rpc('get_digital_book',{'p_child_profile_id':a['child'],'p_book_id':book},a['token'])['page_number']==2,'reading position survives next HTTP request')
good('/rest/v1/child_content_progress','POST',{'child_profile_id':a['child'],'content_item_id':content,'status':'completed','completed_at':'2026-09-26T00:00:00Z'},a['token'])
check(True,'activity completion with guarded XP trigger')
good('/rest/v1/child_book_progress','POST',{'child_profile_id':a['child'],'book_id':book,'status':'completed'},a['token'])
check(rpc('complete_child_book_adventure',{'p_child_profile_id':a['child'],'p_book_id':book},a['token']) is True,'Book Adventure HTTP completion')
xp=good('/rest/v1/xp_ledger?child_profile_id=eq.'+a['child'],token=a['token'])
rpc('complete_child_book_adventure',{'p_child_profile_id':a['child'],'p_book_id':book},a['token'])
check(len(good('/rest/v1/xp_ledger?child_profile_id=eq.'+a['child'],token=a['token']))==len(xp) and len(xp)>0,'duplicate completion does not award duplicate XP')
# Password update/reset uses the same Auth update endpoint. Hosted HIBP availability
# is separate; the local instance proves session and rejection/retry compatibility.
code,error=req('/auth/v1/user','PUT',{'password':'x'},a['token']);check(code==422 and error.get('code')=='weak_password','weak password change rejected cleanly')
new_password=secrets.token_urlsafe(30)+'aA7!'
good('/auth/v1/user','PUT',{'password':new_password},a['token'])
check(bool(good('/auth/v1/token?grant_type=password','POST',{'email':a['email'],'password':new_password})['access_token']),'valid password change and new sign-in')
# Verify a recovery token obtained through LOCAL admin generate_link; no email send.
link=good('/auth/v1/admin/generate_link','POST',{'type':'recovery','email':a['email']},admin=True)
recovery=good('/auth/v1/verify','POST',{'type':'recovery','token_hash':link['hashed_token']})
good('/auth/v1/user','PUT',{'password':secrets.token_urlsafe(30)+'aA7!'},recovery['access_token'])
check(True,'recovery verification and password reset')
print(f'PASS: {checks} Auth/PostgREST checks; synthetic data remains only in disposable container for teardown',flush=True)
