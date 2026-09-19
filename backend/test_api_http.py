import requests

# 1. Login
r_login = requests.post('http://127.0.0.1:8001/api/v1/auth/login', json={'email': 'demo@example.com', 'password': 'password'})
print('Login status:', r_login.status_code)
if r_login.status_code != 200:
    print('Login response:', r_login.text)

token = r_login.json().get('access_token') if r_login.status_code == 200 else None

# 2. Fetch Article
headers = {'Authorization': f'Bearer {token}'} if token else {}
r_article = requests.get('http://127.0.0.1:8001/api/v1/articles/cd785202-e728-42fa-a7de-07d2c1d3e90d', headers=headers)
print('Article status:', r_article.status_code)
if r_article.status_code == 200:
    blocks = r_article.json().get('blocks', [])
    for b in blocks:
        if b.get('type') == 'PODCAST':
            print('PODCAST BLOCK:', b)
else:
    print('Article response:', r_article.text)
