import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.main import app

for route in app.routes:
    print(getattr(route, "path", route.name))
