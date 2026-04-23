import http.server
import os
os.chdir('/Users/kenwong/Documents/Claude_AI/acd-site')
handler = http.server.SimpleHTTPRequestHandler
httpd = http.server.HTTPServer(('', 3456), handler)
httpd.serve_forever()
