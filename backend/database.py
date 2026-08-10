import psycopg

def get_connection():
    return psycopg.connect(
        host="localhost",
        port=5432,
        dbname="reatail_pos_db",
        user="postgres",
        password="14082002"
   )