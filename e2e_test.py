import requests
import sys

BASE_URL = "http://localhost:8080/api/v1"
ML_URL = "http://localhost:8000"

def log(msg, success=True):
    prefix = "PASS" if success else "FAIL"
    print(f"[{prefix}] {msg}")

def run_e2e_tests():
    print("========================================")
    print("STARTING FULL END-TO-END SYSTEM TEST")
    print("========================================")
    
    # 1. ML Service Health
    try:
        r = requests.get(f"{ML_URL}/ml/v1/health", timeout=5)
        assert r.status_code == 200 and r.json().get("status") == "ok"
        log("1. ML Engine Health Endpoint")
    except Exception as e:
        log(f"1. ML Engine Health: {e}", False)
        return False

    # 2. Student Authentication
    s_client = requests.Session()
    try:
        r = s_client.post(f"{BASE_URL}/auth/login", json={"email": "student@test.com", "password": "Password123!"})
        assert r.status_code == 200 and r.json().get("role") == "STUDENT"
        me = s_client.get(f"{BASE_URL}/auth/me")
        assert me.status_code == 200 and me.json().get("email") == "student@test.com"
        log("2. Student Authentication (Login & Session Cookie)")
    except Exception as e:
        log(f"2. Student Auth: {e}", False)
        return False

    # 3. Quiz Generation by Topic & Attempt Evaluation
    try:
        gen = s_client.post(f"{BASE_URL}/quizzes/generate", json={"topic": "Microprocessors and Architecture", "count": 3})
        assert gen.status_code == 201
        quiz_id = gen.json()["id"]
        
        detail = s_client.get(f"{BASE_URL}/quizzes/{quiz_id}")
        assert detail.status_code == 200
        questions = detail.json()["questions"]
        assert len(questions) == 3
        
        answers = [q["options"][q["correct_index"]] for q in questions]
        att = s_client.post(f"{BASE_URL}/quizzes/{quiz_id}/attempt", json={"answers": answers})
        assert att.status_code == 200
        assert att.json()["score"] == 3 and att.json()["accuracyPercent"] == 100
        log("3. Quiz Generation by Topic & Attempt Evaluation (Score: 3/3, 100%)")
    except Exception as e:
        log(f"3. Quizzes: {e}", False)
        return False

    # 4. Flashcard Generation by Topic & SM-2 Review
    try:
        fc_gen = s_client.post(f"{BASE_URL}/flashcards/generate", json={"topic": "Network Protocols", "count": 3})
        assert fc_gen.status_code in [200, 201]
        cards = fc_gen.json()
        assert len(cards) >= 1
        card_id = cards[0]["id"]
        
        rev = s_client.post(f"{BASE_URL}/flashcards/{card_id}/review", json={"quality": 3})
        assert rev.status_code == 200
        assert "projectedIntervals" in rev.json()
        
        stats = s_client.get(f"{BASE_URL}/flashcards/stats")
        assert stats.status_code == 200 and stats.json()["total"] > 0
        log("4. Flashcard Generation & SM-2 Spaced Repetition Review")
    except Exception as e:
        log(f"4. Flashcards: {e}", False)
        return False

    # 5. Study Tasks Lifecycle
    try:
        t_create = s_client.post(f"{BASE_URL}/tasks", json={
            "title": "E2E Automated Task Verification",
            "subject": "Testing",
            "scheduledDate": "2026-10-15",
            "estimatedMinutes": 30,
            "priority": "HIGH"
        })
        assert t_create.status_code == 201
        task_id = t_create.json()["id"]
        
        t_comp = s_client.post(f"{BASE_URL}/tasks/{task_id}/complete")
        assert t_comp.status_code == 200 and t_comp.json()["status"] == "COMPLETED"
        
        t_del = s_client.delete(f"{BASE_URL}/tasks/{task_id}")
        assert t_del.status_code == 204
        log("5. Study Tasks CRUD Lifecycle (Create -> Complete -> Delete)")
    except Exception as e:
        log(f"5. Study Tasks: {e}", False)
        return False

    # 6. Focus Timer Lifecycle
    try:
        f_start = s_client.post(f"{BASE_URL}/focus/sessions", json={})
        if f_start.status_code == 409:
            active = s_client.get(f"{BASE_URL}/focus/sessions/active").json()
            s_client.post(f"{BASE_URL}/focus/sessions/{active['id']}/finish")
            f_start = s_client.post(f"{BASE_URL}/focus/sessions", json={})
            
        assert f_start.status_code == 201
        sess_id = f_start.json()["id"]
        
        f_pause = s_client.patch(f"{BASE_URL}/focus/sessions/{sess_id}/pause")
        assert f_pause.status_code == 200 and f_pause.json()["status"] == "PAUSED"
        
        f_resume = s_client.patch(f"{BASE_URL}/focus/sessions/{sess_id}/resume")
        assert f_resume.status_code == 200 and f_resume.json()["status"] == "ACTIVE"
        
        f_finish = s_client.post(f"{BASE_URL}/focus/sessions/{sess_id}/finish")
        assert f_finish.status_code == 200 and f_finish.json()["status"] == "COMPLETED"
        log("6. Focus Mode Timer Lifecycle (Start -> Pause -> Resume -> Finish)")
    except Exception as e:
        log(f"6. Focus Mode: {e}", False)
        return False

    # 7. AI Tutor Question Asking
    try:
        tutor_res = s_client.post(f"{BASE_URL}/tutor/ask", json={"question": "What is binary search and what is its time complexity?"})
        assert tutor_res.status_code == 200
        t_data = tutor_res.json()
        assert t_data.get("conversationId") is not None
        assert len(t_data.get("messages", [])) >= 2
        log("7. AI Tutor (ChatGPT Mode / NLP Query)")
    except Exception as e:
        log(f"7. AI Tutor: {e}", False)
        return False

    # 8. Parent Portal
    p_client = requests.Session()
    try:
        p_login = p_client.post(f"{BASE_URL}/auth/login", json={"email": "parent@test.com", "password": "Password123!"})
        assert p_login.status_code == 200 and p_login.json()["role"] == "PARENT"
        
        children = p_client.get(f"{BASE_URL}/parents/children")
        assert children.status_code == 200
        assert len(children.json()) >= 1
        child_id = children.json()[0]["id"]
        
        prog = p_client.get(f"{BASE_URL}/parents/children/{child_id}/progress")
        assert prog.status_code == 200
        assert "quizAccuracyPercent" in prog.json() or "studyMinutes" in prog.json()
        log("8. Parent Portal (Children linked & live progress)")
    except Exception as e:
        log(f"8. Parent Portal: {e}", False)
        return False

    # 9. Admin Portal
    a_client = requests.Session()
    try:
        a_login = a_client.post(f"{BASE_URL}/auth/login", json={"email": "admin@test.com", "password": "Password123!"})
        assert a_login.status_code == 200 and a_login.json()["role"] == "ADMIN"
        
        sys_telemetry = a_client.get(f"{BASE_URL}/admin/system")
        assert sys_telemetry.status_code == 200
        data = sys_telemetry.json()
        assert data.get("users", 0) > 0
        assert "serverTelemetry" in data
        
        users_list = a_client.get(f"{BASE_URL}/admin/users")
        assert users_list.status_code == 200 and len(users_list.json()) > 0
        log("9. Admin Portal (Telemetry, JVM diagnostics & user management)")
    except Exception as e:
        log(f"9. Admin Portal: {e}", False)
        return False

    print("========================================")
    print("ALL 9 CRITICAL E2E INTEGRATION SUITES PASSED!")
    print("========================================")
    return True

if __name__ == "__main__":
    success = run_e2e_tests()
    sys.exit(0 if success else 1)
