import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User
from app.core.security import get_password_hash, create_access_token

# In-memory SQLite for tests
TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def db_engine():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    SessionLocalTest = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = SessionLocalTest()

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def test_users(db_session):
    pwd_hash = get_password_hash("TestPassword123")
    admin = User(name="Admin User", email="admin@test.gov.in", password_hash=pwd_hash, role="Admin", bureau="Central", is_active=True)
    rb_officer = User(name="RB Officer", email="rb@test.gov.in", password_hash=pwd_hash, role="RB Officer", bureau="Regulation Bureau (RB)", is_active=True)
    pgrc_officer = User(name="PGRC Officer", email="pgrc@test.gov.in", password_hash=pwd_hash, role="PGRC Officer", bureau="Public Grievance Redressal Cell (PGRC)", is_active=True)
    senior_mgmt = User(name="Senior Mgmt", email="senior@test.gov.in", password_hash=pwd_hash, role="Senior Management", bureau="Central Executive", is_active=True)

    db_session.add_all([admin, rb_officer, pgrc_officer, senior_mgmt])
    db_session.commit()

    return {
        "admin": admin,
        "rb_officer": rb_officer,
        "pgrc_officer": pgrc_officer,
        "senior_mgmt": senior_mgmt,
        "admin_token": create_access_token(admin.id),
        "rb_token": create_access_token(rb_officer.id),
        "pgrc_token": create_access_token(pgrc_officer.id),
        "senior_token": create_access_token(senior_mgmt.id),
    }
