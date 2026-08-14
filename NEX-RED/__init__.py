"""
NEX-RED Package Initializer
"""
import os
import sys

# Ensure NEX-RED directory is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
