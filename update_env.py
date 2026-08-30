import os
import re

env_file = 'c:/Users/devan/OneDrive/Desktop/AgentCart/backend/.env'
out_file = 'c:/Users/devan/OneDrive/Desktop/AgentCart/frontend/.env.local'

with open(env_file, 'r') as f:
    content = f.read()

match = re.search(r'RAZORPAY_KEY_ID=[\'"]?([^\'"\n]+)[\'"]?', content)
if match:
    key_id = match.group(1)
    print(f'Found key: {key_id}')
    
    with open(out_file, 'a') as out:
        out.write(f'\nNEXT_PUBLIC_RAZORPAY_KEY_ID={key_id}\n')
    print('Appended to frontend/.env.local')
else:
    print('Could not find key')
