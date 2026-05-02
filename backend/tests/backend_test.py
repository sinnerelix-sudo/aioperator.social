"""
Backend API tests for AI Operator MVP.
Covers: health, auth (register/login/me/plans), subscription (trial auto-create),
bots CRUD + plan limit enforcement + connect mock, products CRUD, activities.
"""
import os
import uuid
import pytest
import requests

BASE_URL = "https://bot-dm-reply.preview.emergentagent.com"
API = f"{BASE_URL}/api"


def _rand_email(prefix="qa.user"):
    return f"TEST_{prefix}+{uuid.uuid4().hex[:10]}@aioperator.local"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def registered_user(session):
    """Register a default trial (combo plan = 1 bot limit) user once for the session."""
    payload = {
        "firstName": "QA",
        "lastName": "Tester",
        "email": _rand_email("combo"),
        "phone": "+994501112233",
        "password": "Password123!",
        "plan": "combo",
        "locale": "az",
    }
    r = session.post(f"{API}/auth/register", json=payload, timeout=20)
    assert r.status_code == 201, f"register failed {r.status_code} {r.text}"
    data = r.json()
    return {**data, "password": payload["password"], "email": payload["email"]}


@pytest.fixture
def auth_headers(registered_user):
    return {"Authorization": f"Bearer {registered_user['token']}"}


# ---------- Health ----------
class TestHealth:
    def test_health_ok(self, session):
        r = session.get(f"{API}/health", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert d["trialMode"] is True
        assert d["paymentEnabled"] is False
        assert d["db"] == "connected"


# ---------- CORS preflight ----------
class TestCORS:
    def test_preflight_aioperator_social(self, session):
        r = session.options(f"{API}/health", headers={
            "Origin": "https://www.aioperator.social",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "content-type,authorization",
        }, timeout=10)
        assert r.status_code in (200, 204)
        allow = r.headers.get("access-control-allow-origin")
        assert allow in ("https://www.aioperator.social", "*"), f"unexpected ACAO {allow}"

    def test_preflight_apex_domain(self, session):
        r = session.options(f"{API}/health", headers={
            "Origin": "https://aioperator.social",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "content-type,authorization",
        }, timeout=10)
        assert r.status_code in (200, 204)
        allow = r.headers.get("access-control-allow-origin")
        assert allow in ("https://aioperator.social", "*"), f"unexpected ACAO {allow}"


# ---------- Plans ----------
class TestPlans:
    def test_get_plans(self, session):
        r = session.get(f"{API}/auth/plans", timeout=10)
        assert r.status_code == 200
        plans = r.json()["plans"]
        ids = sorted(p["id"] for p in plans)
        assert ids == ["business", "combo", "instagram", "whatsapp"]
        # business=5, others=1
        for p in plans:
            if p["id"] == "business":
                assert p["botLimit"] == 5
            else:
                assert p["botLimit"] == 1


# ---------- Auth ----------
class TestAuth:
    def test_register_returns_active_trial(self, session):
        payload = {
            "firstName": "Reg", "lastName": "User",
            "email": _rand_email("reg"), "phone": "+994500000001",
            "password": "Password123!", "plan": "instagram", "locale": "az",
        }
        r = session.post(f"{API}/auth/register", json=payload, timeout=15)
        assert r.status_code == 201, r.text
        d = r.json()
        assert d.get("token")
        assert d["user"]["email"] == payload["email"].lower()
        sub = d["subscription"]
        assert sub is not None, "subscription must NOT be null in TRIAL_MODE"
        assert sub["status"] == "active"
        assert sub["isTrial"] is True
        assert sub["plan"] == "instagram"
        assert sub["botLimit"] == 1

    def test_register_duplicate_email(self, session, registered_user):
        payload = {
            "firstName": "Dup", "lastName": "User",
            "email": registered_user["email"], "phone": "+994500000002",
            "password": "Password123!",
        }
        r = session.post(f"{API}/auth/register", json=payload, timeout=15)
        assert r.status_code == 409
        assert r.json()["error"] == "email_exists"

    def test_register_validation_error(self, session):
        r = session.post(f"{API}/auth/register", json={"email": "bad"}, timeout=10)
        assert r.status_code == 400
        assert r.json()["error"] == "validation_error"

    def test_login_success_returns_subscription(self, session, registered_user):
        r = session.post(f"{API}/auth/login", json={
            "email": registered_user["email"], "password": registered_user["password"]
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("token")
        assert d["subscription"] is not None, "subscription must NOT be null"
        assert d["subscription"]["status"] == "active"

    def test_login_invalid_credentials(self, session, registered_user):
        r = session.post(f"{API}/auth/login", json={
            "email": registered_user["email"], "password": "WrongPass!"
        }, timeout=10)
        assert r.status_code == 401
        assert r.json()["error"] == "invalid_credentials"

    def test_me_requires_token(self, session):
        r = session.get(f"{API}/auth/me", timeout=10)
        assert r.status_code in (401, 403)

    def test_me_returns_user_and_subscription(self, session, auth_headers):
        r = session.get(f"{API}/auth/me", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "user" in d and "subscription" in d
        assert d["subscription"] is not None
        assert d["subscription"]["status"] == "active"

    def test_me_auto_creates_trial_for_user_without_sub(self, session):
        """Register a user, then verify /me always returns an active sub even if none existed."""
        # Already validated by register — additionally hit /me with new login to ensure idempotency.
        email = _rand_email("autotrial")
        session.post(f"{API}/auth/register", json={
            "firstName": "Auto", "lastName": "Trial", "email": email,
            "phone": "+994500000003", "password": "Password123!",
        }, timeout=15)
        login = session.post(f"{API}/auth/login", json={"email": email, "password": "Password123!"}, timeout=10)
        token = login.json()["token"]
        me = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=10)
        assert me.json()["subscription"] is not None


# ---------- Subscription ----------
class TestSubscription:
    def test_get_subscription(self, session, auth_headers):
        r = session.get(f"{API}/subscription", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["trialMode"] is True
        assert d["paymentEnabled"] is False
        assert d["subscription"] is not None

    def test_select_plan_business(self, session):
        # use a fresh user so we can change plan freely
        email = _rand_email("plan")
        reg = session.post(f"{API}/auth/register", json={
            "firstName": "Plan", "lastName": "Switch", "email": email,
            "phone": "+994500000004", "password": "Password123!", "plan": "instagram",
        }, timeout=15)
        token = reg.json()["token"]
        h = {"Authorization": f"Bearer {token}"}
        r = session.post(f"{API}/subscription/select-plan", json={"plan": "business"}, headers=h, timeout=10)
        assert r.status_code == 200
        sub = r.json()["subscription"]
        assert sub["plan"] == "business"
        assert sub["botLimit"] == 5
        # Verify persistence
        r2 = session.get(f"{API}/subscription", headers=h, timeout=10).json()
        assert r2["subscription"]["plan"] == "business"
        assert r2["subscription"]["botLimit"] == 5

    def test_select_plan_invalid(self, session, auth_headers):
        r = session.post(f"{API}/subscription/select-plan", json={"plan": "xxx"}, headers=auth_headers, timeout=10)
        assert r.status_code == 400


# ---------- Bots CRUD + limits + connect ----------
class TestBots:
    def test_bot_full_crud_and_limit(self, session):
        # Use the combo-plan registered user with botLimit=1
        email = _rand_email("bots")
        reg = session.post(f"{API}/auth/register", json={
            "firstName": "Bot", "lastName": "Owner", "email": email,
            "phone": "+994500000005", "password": "Password123!", "plan": "combo",
        }, timeout=15)
        token = reg.json()["token"]
        h = {"Authorization": f"Bearer {token}"}

        # List initially empty
        r = session.get(f"{API}/bots", headers=h, timeout=10)
        assert r.status_code == 200
        assert r.json()["bots"] == []

        # Create #1
        r = session.post(f"{API}/bots", headers=h, json={
            "name": "Bot Alpha", "niche": "fashion", "salesStyle": "friendly",
            "instructions": "be polite",
        }, timeout=10)
        assert r.status_code == 201, r.text
        bot1 = r.json()["bot"]
        assert bot1["name"] == "Bot Alpha"
        assert "_id" not in bot1  # toPublic should not leak _id raw key, but id may exist
        bot1_id = bot1.get("id") or bot1.get("_id")

        # GET verifies persistence
        r = session.get(f"{API}/bots", headers=h, timeout=10)
        assert len(r.json()["bots"]) == 1

        # Create #2 must fail with bot_limit_reached
        r = session.post(f"{API}/bots", headers=h, json={"name": "Bot Beta"}, timeout=10)
        assert r.status_code == 403
        assert r.json()["error"] == "bot_limit_reached"

        # Update bot1
        r = session.put(f"{API}/bots/{bot1_id}", headers=h, json={"name": "Bot Alpha v2"}, timeout=10)
        assert r.status_code == 200
        assert r.json()["bot"]["name"] == "Bot Alpha v2"

        # Connect channel = mock 202
        r = session.post(f"{API}/bots/{bot1_id}/connect/instagram", headers=h, json={}, timeout=10)
        assert r.status_code == 202
        d = r.json()
        assert d["pending"] is True
        assert d["channel"] == "instagram"

        # Invalid channel
        r = session.post(f"{API}/bots/{bot1_id}/connect/sms", headers=h, json={}, timeout=10)
        assert r.status_code == 400

        # Delete
        r = session.delete(f"{API}/bots/{bot1_id}", headers=h, timeout=10)
        assert r.status_code == 200

        # Now we can create again
        r = session.post(f"{API}/bots", headers=h, json={"name": "Bot Gamma"}, timeout=10)
        assert r.status_code == 201

    def test_business_plan_allows_5_bots(self, session):
        email = _rand_email("biz")
        reg = session.post(f"{API}/auth/register", json={
            "firstName": "Biz", "lastName": "User", "email": email,
            "phone": "+994500000006", "password": "Password123!", "plan": "business",
        }, timeout=15)
        token = reg.json()["token"]
        h = {"Authorization": f"Bearer {token}"}
        for i in range(5):
            r = session.post(f"{API}/bots", headers=h, json={"name": f"Bot {i+1}"}, timeout=10)
            assert r.status_code == 201, f"bot {i+1} failed: {r.text}"
        # 6th must fail
        r = session.post(f"{API}/bots", headers=h, json={"name": "Bot 6"}, timeout=10)
        assert r.status_code == 403
        assert r.json()["error"] == "bot_limit_reached"

    def test_bots_require_auth(self, session):
        r = session.get(f"{API}/bots", timeout=10)
        assert r.status_code in (401, 403)


# ---------- Products CRUD ----------
class TestProducts:
    def test_product_crud(self, session, auth_headers):
        # CREATE
        payload = {
            "name": "TEST_Sneakers", "image": "https://example.com/x.jpg",
            "price": 99.5, "discountPrice": 79.5, "stock": 12,
            "category": "shoes", "description": "Test product",
        }
        r = session.post(f"{API}/products", headers=auth_headers, json=payload, timeout=10)
        assert r.status_code == 201, r.text
        prod = r.json()["product"]
        assert prod["name"] == "TEST_Sneakers"
        assert prod["price"] == 99.5
        pid = prod.get("id") or prod.get("_id")

        # LIST
        r = session.get(f"{API}/products", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        assert any((p.get("id") or p.get("_id")) == pid for p in r.json()["products"])

        # UPDATE
        r = session.put(f"{API}/products/{pid}", headers=auth_headers, json={"price": 120.0}, timeout=10)
        assert r.status_code == 200
        assert r.json()["product"]["price"] == 120.0

        # DELETE
        r = session.delete(f"{API}/products/{pid}", headers=auth_headers, timeout=10)
        assert r.status_code == 200

        # 404 on get-after-delete (via update attempt)
        r = session.put(f"{API}/products/{pid}", headers=auth_headers, json={"price": 1.0}, timeout=10)
        assert r.status_code == 404


# ---------- Activities ----------
class TestActivities:
    def test_activities_recent(self, session, auth_headers):
        r = session.get(f"{API}/activities", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "activities" in d
        assert isinstance(d["activities"], list)
        # registration must have logged at least one activity
        assert len(d["activities"]) >= 1


# ---------- ObjectId leak guard ----------
class TestNoObjectIdLeak:
    def test_no_raw_objectid_in_user_payload(self, session, registered_user, auth_headers):
        r = session.get(f"{API}/auth/me", headers=auth_headers, timeout=10)
        body = r.text
        # mongo ObjectIds are 24-char hex; UUIDs have dashes. Sanity heuristic:
        assert '"_id"' not in body or '"id"' in body  # toPublic should expose id, not raw _id only


# ---------- Phase 2A: default plan=combo + usedMessages=129 + role=seller ----------
class TestPhase2ADefaults:
    def test_register_without_plan_defaults_to_combo(self, session):
        email = _rand_email("dflt")
        r = session.post(f"{API}/auth/register", json={
            "firstName": "Def", "lastName": "User", "email": email,
            "phone": "+994500000010", "password": "Password123!",
        }, timeout=15)
        assert r.status_code == 201, r.text
        d = r.json()
        sub = d["subscription"]
        assert sub["plan"] == "combo", f"expected combo default, got {sub['plan']}"
        assert sub["botLimit"] == 1
        assert sub["channelLimit"] == 2
        assert sub["monthlyMessageLimit"] == 50000
        assert sub["usedMessages"] == 129
        assert sub.get("resetDate") is not None or sub.get("expiresAt") is not None
        assert sub["isTrial"] is True
        assert sub["paymentStatus"] in ("trial", "paid")
        # role=seller for non-admin
        assert d["user"].get("role") == "seller"

    def test_register_business_plan_fields(self, session):
        email = _rand_email("biz2")
        r = session.post(f"{API}/auth/register", json={
            "firstName": "Biz", "lastName": "User", "email": email,
            "phone": "+994500000011", "password": "Password123!", "plan": "business",
        }, timeout=15)
        assert r.status_code == 201
        sub = r.json()["subscription"]
        assert sub["plan"] == "business"
        assert sub["botLimit"] == 5
        assert sub["channelLimit"] == 5
        assert sub["monthlyMessageLimit"] == 150000

    def test_me_returns_full_subscription_fields(self, session, auth_headers):
        r = session.get(f"{API}/auth/me", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        sub = r.json()["subscription"]
        assert sub is not None
        for f in ("monthlyMessageLimit", "usedMessages", "channelLimit", "plan"):
            assert f in sub, f"missing field {f}"

    def test_persistence_after_reregister_login(self, session):
        """Persistence proxy: create → close session → new session → /me returns same data."""
        email = _rand_email("persist")
        password = "Password123!"
        r = session.post(f"{API}/auth/register", json={
            "firstName": "Per", "lastName": "Sist", "email": email,
            "phone": "+994500000012", "password": password,
        }, timeout=15)
        assert r.status_code == 201
        original_user_id = r.json()["user"]["id"]

        # New independent session
        s2 = requests.Session()
        s2.headers.update({"Content-Type": "application/json"})
        login = s2.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=10)
        assert login.status_code == 200, login.text
        token = login.json()["token"]
        me = s2.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=10)
        assert me.status_code == 200
        d = me.json()
        assert d["user"]["id"] == original_user_id
        assert d["user"]["email"] == email.lower()
        sub = d["subscription"]
        assert sub["plan"] == "combo"
        assert sub["usedMessages"] == 129
        assert sub["monthlyMessageLimit"] == 50000


# ---------- Phase 2A: GET /api/bots/:id ----------
class TestBotGetById:
    def test_get_bot_by_id_and_404(self, session):
        email = _rand_email("getbot")
        reg = session.post(f"{API}/auth/register", json={
            "firstName": "Get", "lastName": "Bot", "email": email,
            "phone": "+994500000013", "password": "Password123!", "plan": "combo",
        }, timeout=15)
        token = reg.json()["token"]
        h = {"Authorization": f"Bearer {token}"}
        c = session.post(f"{API}/bots", headers=h, json={"name": "Solo Bot"}, timeout=10)
        assert c.status_code == 201
        bid = c.json()["bot"].get("id") or c.json()["bot"].get("_id")
        g = session.get(f"{API}/bots/{bid}", headers=h, timeout=10)
        assert g.status_code == 200
        assert g.json()["bot"]["name"] == "Solo Bot"
        # 404 on unknown
        nf = session.get(f"{API}/bots/00000000-0000-0000-0000-000000000000", headers=h, timeout=10)
        assert nf.status_code == 404


# ---------- Phase 2A: Product with salesNote/imageUrl/botId/status ----------
class TestProductPhase2A:
    def test_product_full_fields_and_status_transition(self, session):
        email = _rand_email("prod2a")
        reg = session.post(f"{API}/auth/register", json={
            "firstName": "Prod", "lastName": "Owner", "email": email,
            "phone": "+994500000014", "password": "Password123!",
        }, timeout=15)
        token = reg.json()["token"]
        h = {"Authorization": f"Bearer {token}"}
        # Create bot to attach
        bres = session.post(f"{API}/bots", headers=h, json={"name": "AttachBot"}, timeout=10)
        bot_id = bres.json()["bot"].get("id") or bres.json()["bot"].get("_id")

        payload = {
            "name": "TEST_FullFields", "price": 199.0, "discountPrice": 149.0,
            "maxDiscount": 25, "stock": 5, "category": "elektronika",
            "description": "test desc", "salesNote": "Çoxsatılan",
            "imageUrl": "https://example.com/img.jpg",
            "botId": bot_id, "status": "active",
        }
        r = session.post(f"{API}/products", headers=h, json=payload, timeout=10)
        assert r.status_code == 201, r.text
        p = r.json()["product"]
        assert p["salesNote"] == "Çoxsatılan"
        assert p["imageUrl"] == "https://example.com/img.jpg"
        assert p["botId"] == bot_id
        assert p["status"] == "active"
        pid = p.get("id") or p.get("_id")

        # Update salesNote and archive
        upd = session.put(f"{API}/products/{pid}", headers=h, json={
            "salesNote": "Yeni qeyd", "status": "archived",
        }, timeout=10)
        assert upd.status_code == 200
        u = upd.json()["product"]
        assert u["salesNote"] == "Yeni qeyd"
        assert u["status"] == "archived"

        # Verify persistence with GET
        g = session.get(f"{API}/products/{pid}", headers=h, timeout=10)
        assert g.status_code == 200
        assert g.json()["product"]["status"] == "archived"


# ---------- Phase 2A: Subscription select-plan derived fields ----------
class TestSelectPlanDerived:
    def test_select_business_updates_all_derived(self, session):
        email = _rand_email("selplan")
        reg = session.post(f"{API}/auth/register", json={
            "firstName": "Sel", "lastName": "Plan", "email": email,
            "phone": "+994500000015", "password": "Password123!",
        }, timeout=15)
        token = reg.json()["token"]
        h = {"Authorization": f"Bearer {token}"}
        r = session.post(f"{API}/subscription/select-plan", json={"plan": "business"},
                         headers=h, timeout=10)
        assert r.status_code == 200
        s = r.json()["subscription"]
        assert s["plan"] == "business"
        assert s["botLimit"] == 5
        assert s["channelLimit"] == 5
        assert s["monthlyMessageLimit"] == 150000
        assert float(s["price"]) == 99.9
