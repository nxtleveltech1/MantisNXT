import os
import requests

api_key = os.environ.get('NEON_API_KEY')
project_id = os.environ.get('NEON_PROJECT_ID')
branch_id = os.environ.get('NEON_BRANCH_ID')

assert api_key and project_id and branch_id, 'Set NEON_API_KEY, NEON_PROJECT_ID, and NEON_BRANCH_ID in your environment.'

url = f"https://console.neon.tech/api/v2/projects/{project_id}/branches/{branch_id}/databases"
headers = {"Authorization": f"Bearer {api_key}"}

response = requests.get(url, headers=headers)
print('Status:', response.status_code)
print(response.json())
