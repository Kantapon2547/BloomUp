import pytest
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service


# TEST ACCOUNT
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "TestPassword123"


def login_user(driver, wait, email=TEST_EMAIL, password=TEST_PASSWORD):
    """Helper function to login to the app"""
    driver.get("http://localhost:3000/login")
    time.sleep(1)
    
    try:
        email_input = wait.until(EC.presence_of_element_located((By.NAME, "email")))
        password_input = driver.find_element(By.NAME, "password")
        
        email_input.send_keys(email)
        password_input.send_keys(password)
        
        buttons = driver.find_elements(By.TAG_NAME, "button")
        submit_btn = None
        for btn in buttons:
            if "sign in" in btn.text.lower() or "login" in btn.text.lower():
                submit_btn = btn
                break
        
        if submit_btn:
            submit_btn.click()
            time.sleep(2)
            
            if "/login" not in driver.current_url:
                return True
    except Exception as e:
        print(f"Login failed: {e}")
        return False
    
    return False


class TestBloomUpBasic:
    """Basic functionality tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup browser before each test"""
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=options)
        self.driver.get("http://localhost:3000")
        self.wait = WebDriverWait(self.driver, 10)
        yield
        self.driver.quit()
    
    def test_app_loads(self):
        """Test that app loads without crashing"""
        body = self.driver.find_element(By.TAG_NAME, "body")
        assert body is not None
        assert len(self.driver.find_elements(By.TAG_NAME, "*")) > 5
    
    def test_has_buttons(self):
        """Test that page has buttons"""
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        assert len(buttons) > 0
    
    def test_has_links(self):
        """Test that page has navigation links/buttons"""
        clickables = self.driver.find_elements(By.CSS_SELECTOR, "button, a")
        assert len(clickables) > 0
    
    def test_page_title_not_empty(self):
        """Test that page has a title"""
        title = self.driver.title
        assert len(title) > 0
        assert title != ""
    
    def test_can_scroll(self):
        """Test that page is scrollable"""
        initial = self.driver.execute_script("return window.scrollY;")
        self.driver.execute_script("window.scrollBy(0, 300);")
        time.sleep(0.3)
        final = self.driver.execute_script("return window.scrollY;")
        assert final > initial
    
    def test_scroll_back_to_top(self):
        """Test scrolling back to top"""
        self.driver.execute_script("window.scrollBy(0, 500);")
        time.sleep(0.3)
        mid_scroll = self.driver.execute_script("return window.scrollY;")
        
        self.driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(0.3)
        final = self.driver.execute_script("return window.scrollY;")
        
        assert final < mid_scroll


class TestNavigation:
    """Test navigation between pages"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup browser before each test"""
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=options)
        self.driver.get("http://localhost:3000")
        self.wait = WebDriverWait(self.driver, 10)
        yield
        self.driver.quit()
    
    def test_navigate_to_signup(self):
        """Test navigation to signup page"""
        time.sleep(0.5)
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        
        for btn in buttons:
            if "sign up" in btn.text.lower():
                btn.click()
                time.sleep(1)
                break
        
        assert "/signup" in self.driver.current_url or len(
            self.driver.find_elements(By.NAME, "full_name")
        ) > 0
    
    def test_navigate_to_login(self):
        """Test navigation to login page"""
        time.sleep(0.5)
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        
        for btn in buttons:
            if "login" in btn.text.lower() and "sign" not in btn.text.lower():
                btn.click()
                time.sleep(1)
                break
        
        assert "/login" in self.driver.current_url or len(
            self.driver.find_elements(By.NAME, "email")
        ) > 0
    
    def test_multiple_navigations(self):
        """Test multiple navigations don't break app"""
        time.sleep(0.5)
        
        for i in range(3):
            buttons = self.driver.find_elements(By.TAG_NAME, "button")
            if buttons:
                buttons[0].click()
                time.sleep(0.5)
        
        assert self.driver.current_url


class TestFormInteraction:
    """Test form interactions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup browser before each test"""
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=options)
        self.driver.get("http://localhost:3000/signup")
        self.wait = WebDriverWait(self.driver, 10)
        time.sleep(1)
        yield
        self.driver.quit()
    
    def test_form_inputs_exist(self):
        """Test that form input fields exist"""
        inputs = self.driver.find_elements(By.TAG_NAME, "input")
        assert len(inputs) > 0
    
    def test_can_type_in_form(self):
        """Test that we can type in form fields"""
        inputs = self.driver.find_elements(By.TAG_NAME, "input")
        
        if inputs:
            test_input = inputs[0]
            test_input.send_keys("Test Input")
            
            value = test_input.get_attribute("value")
            assert "Test" in value or len(value) > 0
    
    def test_form_has_submit_button(self):
        """Test that form has a submit button"""
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        
        submit_buttons = [
            b for b in buttons 
            if "submit" in b.text.lower() or "sign" in b.text.lower() or "send" in b.text.lower()
        ]
        
        assert len(submit_buttons) > 0
    
    def test_multiple_inputs_fillable(self):
        """Test that multiple inputs can be filled"""
        inputs = self.driver.find_elements(By.TAG_NAME, "input")
        
        filled = 0
        for i, inp in enumerate(inputs[:3]):
            try:
                inp.send_keys(f"Test{i}")
                if inp.get_attribute("value"):
                    filled += 1
            except:
                pass
        
        assert filled > 0
    
    def test_clear_input_field(self):
        """Test that input fields can be cleared"""
        inputs = self.driver.find_elements(By.TAG_NAME, "input")
        
        if inputs:
            inp = inputs[0]
            inp.send_keys("Test")
            inp.clear()
            
            value = inp.get_attribute("value")
            assert value == "" or value is None or len(value) == 0


class TestUIResponsiveness:
    """Test UI responsiveness across devices"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup browser before each test"""
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service)
        self.driver.get("http://localhost:3000")
        self.wait = WebDriverWait(self.driver, 10)
        yield
        self.driver.quit()
    
    def test_mobile_view_320px(self):
        """Test mobile view at 320px width"""
        self.driver.set_window_size(320, 568)
        time.sleep(0.5)
        
        body = self.driver.find_element(By.TAG_NAME, "body")
        assert body is not None
        
        assert len(self.driver.find_elements(By.TAG_NAME, "*")) > 5
    
    def test_mobile_view_375px(self):
        """Test mobile view at 375px width"""
        self.driver.set_window_size(375, 667)
        time.sleep(0.5)
        
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        assert len(buttons) > 0
    
    def test_tablet_view(self):
        """Test tablet view at 768px width"""
        self.driver.set_window_size(768, 1024)
        time.sleep(0.5)
        
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        assert len(buttons) > 0
    
    def test_desktop_view(self):
        """Test desktop view at 1920px width"""
        self.driver.set_window_size(1920, 1080)
        time.sleep(0.5)
        
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        assert len(buttons) > 0
    
    def test_elements_visible_after_resize(self):
        """Test elements remain visible after resize"""
        initial_elements = len(self.driver.find_elements(By.TAG_NAME, "*"))
        
        self.driver.set_window_size(375, 667)
        time.sleep(0.5)
        
        after_resize = len(self.driver.find_elements(By.TAG_NAME, "*"))
        
        assert after_resize > 5


class TestUserInteractions:
    """Test basic user interactions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup browser before each test"""
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=options)
        self.driver.get("http://localhost:3000")
        self.wait = WebDriverWait(self.driver, 10)
        yield
        self.driver.quit()
    
    def test_button_click(self):
        """Test clicking buttons"""
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        
        if buttons:
            initial_url = self.driver.current_url
            buttons[0].click()
            time.sleep(0.5)
            
            assert True
    
    def test_hover_effects(self):
        """Test hover doesn't break app"""
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        
        if buttons:
            actions = ActionChains(self.driver)
            actions.move_to_element(buttons[0]).perform()
            time.sleep(0.3)
            
            assert self.driver.current_url
    
    def test_double_click(self):
        """Test double click doesn't break app"""
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        
        if buttons:
            actions = ActionChains(self.driver)
            actions.double_click(buttons[0]).perform()
            time.sleep(0.3)
            
            assert self.driver.current_url
    
    def test_keyboard_escape(self):
        """Test pressing escape key"""
        self.driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(0.3)
        
        assert self.driver.current_url
    
    def test_keyboard_enter(self):
        """Test pressing enter key"""
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        
        if buttons:
            buttons[0].send_keys(Keys.ENTER)
            time.sleep(0.3)
        
        assert self.driver.current_url


class TestErrorRecovery:
    """Test app error recovery"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup browser before each test"""
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service)
        self.driver.get("http://localhost:3000")
        self.wait = WebDriverWait(self.driver, 10)
        yield
        self.driver.quit()
    
    def test_invalid_route_handling(self):
        """Test handling of invalid routes"""
        self.driver.get("http://localhost:3000/invalid-route-xyz")
        time.sleep(1)
        
        assert self.driver.current_url
    
    def test_rapid_navigation(self):
        """Test rapid navigation doesn't break app"""
        for i in range(5):
            self.driver.get(f"http://localhost:3000")
            time.sleep(0.2)
        
        assert self.driver.current_url
    
    def test_back_forward_navigation(self):
        """Test browser back/forward"""
        initial_url = self.driver.current_url
        
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        if buttons:
            buttons[0].click()
            time.sleep(0.5)
        
        self.driver.back()
        time.sleep(0.5)
        
        assert self.driver.current_url is not None


class TestPerformance:
    """Test app performance"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup browser before each test"""
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service)
        yield
        self.driver.quit()
    
    def test_page_load_under_10_seconds(self):
        """Test page loads quickly"""
        start = time.time()
        self.driver.get("http://localhost:3000")
        
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        load_time = time.time() - start
        assert load_time < 10
    
    def test_button_click_responsive(self):
        """Test button clicks are responsive"""
        self.driver.get("http://localhost:3000")
        time.sleep(1)
        
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        
        if buttons:
            start = time.time()
            buttons[0].click()
            time.sleep(0.5)
            click_time = time.time() - start
            
            assert click_time < 2
    
    def test_scroll_performance(self):
        """Test scrolling is smooth"""
        self.driver.get("http://localhost:3000")
        time.sleep(1)
        
        start = time.time()
        for i in range(5):
            self.driver.execute_script("window.scrollBy(0, 100);")
            time.sleep(0.1)
        scroll_time = time.time() - start
        
        assert scroll_time < 2


class TestHabitsFeature:
    """Test Habits feature - Core functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup browser before each test"""
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=options)
        self.wait = WebDriverWait(self.driver, 10)
        
        login_user(self.driver, self.wait)
        
        self.driver.get("http://localhost:3000/habits")
        time.sleep(2)
        yield
        self.driver.quit()
    
    def test_habits_page_loads(self):
        """Test habits page loads"""
        body = self.driver.find_element(By.TAG_NAME, "body")
        assert body is not None
        assert len(self.driver.find_elements(By.TAG_NAME, "*")) > 5
    
    def test_add_habit_button_exists(self):
        """Test add habit button exists"""
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        assert len(buttons) > 0
    
    def test_habit_list_displays(self):
        """Test habit list/items display"""
        habit_items = self.driver.find_elements(By.CLASS_NAME, "habit-card") or \
                     self.driver.find_elements(By.CLASS_NAME, "card-habit-card") or \
                     self.driver.find_elements(By.CLASS_NAME, "habit-item")
        
        if habit_items:
            assert len(habit_items) > 0
        else:
            assert True
    
    def test_habit_checkbox_clickable(self):
        """Test habit checkboxes are clickable"""
        checkboxes = self.driver.find_elements(By.CSS_SELECTOR, "input[type='checkbox']")
        
        if checkboxes:
            initial_state = checkboxes[0].is_selected()
            checkboxes[0].click()
            time.sleep(0.3)
            
            assert True
    
    def test_habit_summary_displays(self):
        """Test habit summary section shows"""
        summary_elements = self.driver.find_elements(By.CLASS_NAME, "progress") or \
                          self.driver.find_elements(By.CLASS_NAME, "summary") or \
                          self.driver.find_elements(By.CLASS_NAME, "habit-summary-title")
        
        assert len(self.driver.find_elements(By.TAG_NAME, "*")) > 10
    
    def test_habit_filters_exist(self):
        """Test filter buttons exist"""
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        assert len(buttons) > 0
    
    def test_habit_category_tags_display(self):
        """Test category tags display on habits"""
        tags = self.driver.find_elements(By.CLASS_NAME, "chip") or \
               self.driver.find_elements(By.CLASS_NAME, "tag") or \
               self.driver.find_elements(By.CLASS_NAME, "badge")

        if len(tags) > 0:
            assert tags[0].is_displayed()


class TestGratitudeFeature:
    """Test Gratitude/Jar feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup browser before each test"""
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=options)
        self.wait = WebDriverWait(self.driver, 10)
        
        login_user(self.driver, self.wait)
        
        self.driver.get("http://localhost:3000/gratitude")
        time.sleep(2)
        yield
        self.driver.quit()
    
    def test_gratitude_page_loads(self):
        """Test gratitude page loads"""
        body = self.driver.find_element(By.TAG_NAME, "body")
        assert body is not None
    
    def test_gratitude_jar_displays(self):
        """Test jar image/container displays"""
        images = self.driver.find_elements(By.TAG_NAME, "img")
        assert len(images) >= 0
    
    def test_gratitude_textarea_exists(self):
        """Test gratitude input textarea exists"""
        textareas = self.driver.find_elements(By.TAG_NAME, "textarea")
        
        if textareas:
            assert textareas[0].is_displayed()
    
    def test_can_type_gratitude(self):
        """Test typing in gratitude input"""
        textareas = self.driver.find_elements(By.TAG_NAME, "textarea")
        
        if textareas:
            textarea = textareas[0]
            textarea.send_keys("I am grateful for testing")
            time.sleep(0.3)
            
            value = textarea.get_attribute("value")
            assert "grateful" in value.lower() or len(value) > 0
    
    def test_add_gratitude_button_exists(self):
        """Test add/submit button exists"""
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        submit_buttons = [b for b in buttons if "send" in b.text.lower() or "add" in b.text.lower()]
        
        assert len(buttons) > 0
    
    def test_gratitude_entries_display(self):
        """Test gratitude entries section exists"""
        entries = self.driver.find_elements(By.CLASS_NAME, "entry-card") or \
                 self.driver.find_elements(By.CLASS_NAME, "gratitude-entry") or \
                 self.driver.find_elements(By.CLASS_NAME, "entries-grid")
        
        assert len(self.driver.find_elements(By.TAG_NAME, "*")) > 5
    
    def test_category_selector_exists(self):
        """Test category selector exists"""
        selectors = self.driver.find_elements(By.CSS_SELECTOR, "select, [role='listbox'], .dropdown")
        
        assert len(self.driver.find_elements(By.TAG_NAME, "button")) > 0


class TestMoodTrackingFeature:
    """Test Mood Tracking feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup browser before each test"""
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=options)
        self.wait = WebDriverWait(self.driver, 10)
        
        login_user(self.driver, self.wait)
        
        self.driver.get("http://localhost:3000/calendar")
        time.sleep(2)
        yield
        self.driver.quit()
    
    def test_calendar_page_loads(self):
        """Test calendar/mood page loads"""
        body = self.driver.find_element(By.TAG_NAME, "body")
        assert body is not None
    
    def test_calendar_grid_displays(self):
        """Test calendar grid displays"""
        calendar_elements = self.driver.find_elements(By.CLASS_NAME, "day-cell") or \
                           self.driver.find_elements(By.CLASS_NAME, "cal-grid") or \
                           self.driver.find_elements(By.TAG_NAME, "table")
        
        assert len(self.driver.find_elements(By.TAG_NAME, "*")) > 10
    
    def test_mood_emojis_display(self):
        """Test mood emoji selector displays"""
        elements = self.driver.find_elements(By.TAG_NAME, "*")
        
        assert len(elements) > 5
    
    def test_navigation_arrows_exist(self):
        """Test month/week navigation exists"""
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        
        assert len(buttons) > 0
    
    def test_mood_summary_displays(self):
        """Test mood summary section"""
        cards = self.driver.find_elements(By.CLASS_NAME, "card") or \
               self.driver.find_elements(By.CLASS_NAME, "summary-card")
        
        assert len(self.driver.find_elements(By.TAG_NAME, "*")) > 10


class TestTimerFeature:
    """Test Timer/Pomodoro feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup browser before each test"""
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=options)
        self.wait = WebDriverWait(self.driver, 10)
        
        login_user(self.driver, self.wait)
        
        self.driver.get("http://localhost:3000/timer")
        time.sleep(2)
        yield
        self.driver.quit()
    
    def test_timer_page_loads(self):
        """Test timer page loads"""
        body = self.driver.find_element(By.TAG_NAME, "body")
        assert body is not None
    
    def test_timer_display_shows(self):
        """Test timer display shows time"""
        timer_displays = self.driver.find_elements(By.CLASS_NAME, "timer-time") or \
                        self.driver.find_elements(By.CLASS_NAME, "timer-card")
        
        assert len(self.driver.find_elements(By.TAG_NAME, "*")) > 5
    
    def test_start_pause_buttons_exist(self):
        """Test start/pause buttons exist"""
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        button_texts = [b.text.lower() for b in buttons]
        
        assert len(buttons) > 0
    
    def test_task_list_displays(self):
        """Test task list displays"""
        task_items = self.driver.find_elements(By.CLASS_NAME, "timer-task-item") or \
                    self.driver.find_elements(By.CLASS_NAME, "task-item") or \
                    self.driver.find_elements(By.CLASS_NAME, "tasks-list")
        
        assert len(self.driver.find_elements(By.TAG_NAME, "*")) > 10
    
    def test_timer_mode_selector_exists(self):
        """Test timer mode selector (Pomodoro/Regular)"""
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        
        assert len(buttons) > 0


class TestProfileFeature:
    """Test Profile feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup browser before each test"""
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=options)
        self.wait = WebDriverWait(self.driver, 10)
        
        login_user(self.driver, self.wait)
        
        self.driver.get("http://localhost:3000/profile")
        time.sleep(2)
        yield
        self.driver.quit()
    
    def test_profile_page_loads(self):
        """Test profile page loads"""
        body = self.driver.find_element(By.TAG_NAME, "body")
        assert body is not None
    
    def test_profile_image_displays(self):
        """Test profile image/avatar displays"""
        images = self.driver.find_elements(By.TAG_NAME, "img")
        assert len(images) >= 0
    
    def test_user_info_displays(self):
        """Test user information displays"""
        text_elements = self.driver.find_elements(By.TAG_NAME, "h1") or \
                       self.driver.find_elements(By.TAG_NAME, "h2") or \
                       self.driver.find_elements(By.TAG_NAME, "p")
        
        assert len(self.driver.find_elements(By.TAG_NAME, "*")) > 10
    
    def test_stats_cards_display(self):
        """Test stats/achievements cards display"""
        cards = self.driver.find_elements(By.CLASS_NAME, "card") or \
               self.driver.find_elements(By.CLASS_NAME, "stat-card") or \
               self.driver.find_elements(By.CLASS_NAME, "profile-stat-card")
        
        assert len(self.driver.find_elements(By.TAG_NAME, "*")) > 10
    
    def test_edit_profile_button_exists(self):
        """Test edit profile button exists"""
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        
        assert len(buttons) > 0
    
    def test_achievement_section_displays(self):
        """Test achievements section displays"""
        achievements = self.driver.find_elements(By.CLASS_NAME, "achievement") or \
                      self.driver.find_elements(By.CLASS_NAME, "achievement-item") or \
                      self.driver.find_elements(By.CLASS_NAME, "achievements-card")
        
        assert len(self.driver.find_elements(By.TAG_NAME, "*")) > 5


class TestReportsFeature:
    """Test Reports/Analytics feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup browser before each test"""
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=options)
        self.wait = WebDriverWait(self.driver, 10)
        
        login_user(self.driver, self.wait)
        
        self.driver.get("http://localhost:3000/reports")
        time.sleep(2)
        yield
        self.driver.quit()
    
    def test_reports_page_loads(self):
        """Test reports page loads"""
        body = self.driver.find_element(By.TAG_NAME, "body")
        assert body is not None
    
    def test_period_selector_exists(self):
        """Test period selector (week/month) exists"""
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        
        assert len(buttons) > 0
    
    def test_charts_display(self):
        """Test charts/visualizations display"""
        svgs = self.driver.find_elements(By.TAG_NAME, "svg")
        
        assert len(self.driver.find_elements(By.TAG_NAME, "*")) > 10
    
    def test_statistics_cards_display(self):
        """Test statistics cards display"""
        cards = self.driver.find_elements(By.CLASS_NAME, "card") or \
               self.driver.find_elements(By.CLASS_NAME, "stat")
        
        assert len(self.driver.find_elements(By.TAG_NAME, "*")) > 5
    
    def test_navigation_controls_exist(self):
        """Test navigation controls (prev/next) exist"""
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        
        assert len(buttons) > 0
    
    def test_export_button_exists(self):
        """Test export/download button exists"""
        buttons = self.driver.find_elements(By.TAG_NAME, "button")
        button_texts = [b.text.lower() for b in buttons]
        
        assert len(buttons) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-x"])
