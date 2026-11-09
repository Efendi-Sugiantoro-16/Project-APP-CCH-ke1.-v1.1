"""
Script CLI untuk menjalankan seeder demo medsos CCH.
Dijalankan via: python scripts/seed_social_demo.py
"""

import sys
import os

# Tambahkan root path CCH-AI-ENGINE ke sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.seeders.social_demo_seeder import seed_all_demo_tickets

if __name__ == "__main__":
    print("=" * 60)
    print("   CCH AI ENGINE - OMNICHANNEL SOCIAL DEMO SEEDER")
    print("=" * 60)
    tickets = seed_all_demo_tickets()
    print(f"[*] Berhasil menyemai {len(tickets)} tiket demo ke MariaDB cch:")
    for t in tickets:
        print(f"    -> Tiket: {t} [STATUS: 101 ENTRI]")
    print("[*] Selesai dengan sukses!")

