import argparse
import os
import re
import sys
import time
import urllib.parse
from pathlib import Path

# Windows cp949 인코딩 오류 방지
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import pandas as pd

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


class GoogleMapsScraper:
    def __init__(self, headless=True, language="en"):
        self.language = language
        self.options = Options()
        
        if headless:
            self.options.add_argument("--headless=new")
            
        self.options.add_argument(f"--lang={language}")
        self.options.add_argument("--no-sandbox")
        self.options.add_argument("--disable-dev-shm-usage")
        self.options.add_argument("--disable-gpu")
        self.options.add_argument("--start-maximized")
        self.options.add_argument("--window-size=1920,1080")
        self.options.add_argument("--disable-blink-features=AutomationControlled")
        self.options.add_argument(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        )
        self.options.add_experimental_option("excludeSwitches", ["enable-automation"])
        self.options.add_experimental_option("useAutomationExtension", False)
        
        # Chrome 언어 설정 (URL 구조를 훼손하지 않고 원문을 수집하도록 보장)
        self.options.add_experimental_option("prefs", {
            "intl.accept_languages": f"{language},{language}_US,en,en_US,ko_KR"
        })

        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=self.options)
        self.wait = WebDriverWait(self.driver, 10)

    def handle_consent_popups(self):
        """동의/쿠키 팝업 처리"""
        try:
            buttons = self.driver.find_elements(
                By.XPATH, 
                "//button[contains(text(), '모두 수락') or contains(text(), 'Accept all') or contains(text(), '동의') or contains(text(), 'Accept')]"
            )
            for btn in buttons:
                if btn.is_displayed():
                    btn.click()
                    time.sleep(1)
                    break
        except Exception:
            pass

    def extract_place_id(self, url: str) -> str:
        """URL에서 gmap_id (0x...:0x...) 패턴 추출"""
        match = re.search(r"!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)", url)
        if match:
            return match.group(1)
        
        try:
            current_url = self.driver.current_url
            match = re.search(r"!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)", current_url)
            if match:
                return match.group(1)
        except Exception:
            pass
            
        match = re.search(r"(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)", url)
        if match:
            return match.group(1)

        return "UNKNOWN_PLACE_ID"

    def extract_place_name_from_url(self, url: str) -> str:
        """URL 경로(/place/식당이름/)에서 식당 이름 디코딩 및 추출"""
        try:
            unquoted = urllib.parse.unquote(url)
            match = re.search(r"/place/([^/@?]+)", unquoted)
            if match:
                name = match.group(1).replace("+", " ").strip()
                if name and name not in ["Google 지도", "Google Maps"]:
                    return name
        except Exception:
            pass
        return ""

    def extract_place_name(self, url: str) -> str:
        """식당 이름 추출 (DOM -> URL -> Page Title 순 폴백)"""
        place_name = ""
        
        start_time = time.time()
        while time.time() - start_time < 6:
            selectors = ["h1.DUwif", "h1.fontTitleLarge", "h1", "div.DUwif", "div.fontTitleLarge"]
            for sel in selectors:
                try:
                    elems = self.driver.find_elements(By.CSS_SELECTOR, sel)
                    for elem in elems:
                        txt = (elem.get_attribute("textContent") or elem.text or "").strip()
                        if txt and txt not in ["Google 지도", "Google Maps", "검색", "Search"]:
                            place_name = txt
                            break
                    if place_name:
                        break
                except Exception:
                    pass

            if place_name:
                break
            time.sleep(1)

        if not place_name or place_name in ["Google 지도", "Google Maps"]:
            url_name = self.extract_place_name_from_url(url)
            if url_name:
                place_name = url_name

        if not place_name or place_name in ["Google 지도", "Google Maps"]:
            try:
                title = self.driver.title or ""
                if title and title not in ["Google 지도", "Google Maps", "Google"]:
                    if "-" in title:
                        parts = title.split("-")
                        if len(parts) > 1 and parts[0].strip():
                            place_name = parts[0].strip()
                    elif " - " in title:
                        parts = title.split(" - ")
                        if len(parts) > 1 and parts[0].strip():
                            place_name = parts[0].strip()
            except Exception:
                pass

        return place_name or "restaurant"

    def scrape(self, url: str, max_reviews: int = 100) -> tuple[pd.DataFrame, str]:
        target_url = url
        if "!9m1!1b1" not in target_url and "data=" in target_url:
            target_url = target_url.replace("data=", "data=!9m1!1b1")

        print(f"[+] Google Maps 접속 중: {target_url}")
        self.driver.get(target_url)
        
        try:
            self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        except Exception:
            pass
            
        time.sleep(4)
        self.handle_consent_popups()

        # 1. Place ID 추출
        place_id = self.extract_place_id(url)
        print(f"[+] Extracted Place ID: {place_id}")

        # 2. 식당 이름 추출
        place_name = self.extract_place_name(url)
        print(f"[+] 식당 이름: {place_name}")

        # 3. 전체 평점 및 리뷰 수 파싱
        overall_rating = ""
        total_reviews_count = ""
        try:
            rating_elems = self.driver.find_elements(By.CSS_SELECTOR, "div.fontDisplayLarge, div.F72Y3c, span.ce3eFc, div.fontBodyMedium span[aria-hidden='true']")
            for r in rating_elems:
                txt = (r.get_attribute("textContent") or r.text or "").strip()
                if re.match(r"^\d(\.\d)?$", txt):
                    overall_rating = txt
                    break
        except Exception:
            pass

        try:
            review_cnt_elems = self.driver.find_elements(By.CSS_SELECTOR, "div.fontBodySmall, span[aria-label*='리뷰'], span[aria-label*='reviews'], button[data-tab-index='1'], span.ce3eFc")
            for c in review_cnt_elems:
                txt = (c.get_attribute("aria-label") or c.get_attribute("textContent") or c.text or "").strip()
                if txt and ("리뷰" in txt or "개" in txt or "reviews" in txt.lower()):
                    total_reviews_count = txt
                    break
        except Exception:
            pass

        print(f"[+] 전체 평점: {overall_rating} | 총 리뷰 정보: {total_reviews_count}")

        # 총 리뷰 개수 숫자 파싱
        total_available_num = None
        if total_reviews_count:
            num_clean = total_reviews_count.replace(",", "")
            match = re.search(r"(\d+(?:\.\d+)?)\s*(?:k|K|천)?", num_clean)
            if match:
                val = float(match.group(1))
                if "k" in num_clean.lower() or "천" in num_clean:
                    val *= 1000
                total_available_num = int(val)

        target_reviews = max_reviews
        if total_available_num and total_available_num > 0:
            target_reviews = min(max_reviews, total_available_num)
            print(f"[+] 식당 총 리뷰 수({total_available_num}개) 감지 ➔ 최종 수집 목표: {target_reviews}개")
        else:
            print(f"[+] 리뷰 데이터 수집 시작 (목표 수량: {max_reviews}개)...")

        # 4. 리뷰 탭 이동 (이미 리뷰 페이지 접속 여부 감지 및 탭/평점 버튼 클릭)
        print("[+] 리뷰 탭 상태 감지 및 이동 중...")
        card_selectors = "div.jJc9Ad, div.ffR21d, div.WbbL3, div.Gvh3ud, div[data-review-id]"
        
        try:
            self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "button[role='tab'], button.hh2ftd, div.m6QEdf, button[aria-label*='reviews'], span.ce3eFc")))
        except Exception:
            pass
        time.sleep(3)

        existing_cards = self.driver.find_elements(By.CSS_SELECTOR, card_selectors)
        
        if len(existing_cards) > 0:
            print(f"[+] 이미 리뷰 페이지에 직접 접속되어 있습니다 (초기 감지 리뷰: {len(existing_cards)}개). 탭 클릭을 생략합니다.")
        else:
            tab_clicked = False
            time.sleep(2)
            
            # 4-1. 평점/리뷰 버튼 및 탭 클릭 시도
            click_candidates = self.driver.find_elements(By.CSS_SELECTOR, "button[role='tab'], button.hh2ftd, button[data-tab-index], button[aria-label*='reviews'], button[aria-label*='리뷰'], span.ce3eFc, button.HH2Bff")
            for b in click_candidates:
                try:
                    txt = (b.get_attribute("textContent") or b.get_attribute("innerText") or b.text or "").strip()
                    aria = (b.get_attribute("aria-label") or "").strip()
                    combined = f"{aria} {txt}".lower()
                    
                    if ("리뷰" in combined or "review" in combined or "reviews" in combined) and b.is_displayed():
                        if ("about" in combined or "정보" in combined or "개요" in combined or "overview" in combined) and "review" not in combined and "리뷰" not in combined:
                            continue
                        self.driver.execute_script("arguments[0].scrollIntoView(true);", b)
                        self.driver.execute_script("arguments[0].click();", b)
                        tab_clicked = True
                        clean_lbl = re.sub(r'[\uE000-\uF8FF]', '', txt or aria).strip()
                        print(f"[+] 리뷰 탭/버튼 클릭 완료 ({clean_lbl if clean_lbl else '리뷰 영역'})")
                        time.sleep(4)
                        break
                except Exception:
                    pass

            # 4-2. 탭 클릭 미작동 시 리뷰 전용 파라미터(!9m1!1b1) 자동 URL 보정 후 재접속
            existing_cards_after_click = self.driver.find_elements(By.CSS_SELECTOR, card_selectors)
            if len(existing_cards_after_click) == 0:
                if "!9m1!1b1" not in url and "data=" in url:
                    print("[+] 리뷰 전용 파라미터(!9m1!1b1)로 URL 자동 보정 재접속 중...")
                    direct_review_url = url.replace("data=", "data=!9m1!1b1")
                    self.driver.get(direct_review_url)
                    time.sleep(4)

        # 5. 리뷰 스크롤 컨테이너 감지
        scrollable_div = None
        time.sleep(2)

        # 5-1. 후보 컨테이너 탐색 (div.m6QEwb, div.DkB4fd 등)
        try:
            container_candidates = self.driver.find_elements(By.CSS_SELECTOR, "div.m6QEwb, div.DkB4fd, div.m6QEwb.DkB4fd, div.m6QEdf.D6fe2e, div.m6QEdf")
            for cand in container_candidates:
                try:
                    inner_cards = cand.find_elements(By.CSS_SELECTOR, card_selectors)
                    aria_lbl = cand.get_attribute("aria-label") or ""
                    if inner_cards or aria_lbl or "리뷰" in aria_lbl or "reviews" in aria_lbl.lower():
                        if cand.is_displayed():
                            scrollable_div = cand
                            break
                except Exception:
                    pass
        except Exception:
            pass

        # 5-2. 카드 기준 부모 스크롤 컨테이너 탐색
        if not scrollable_div:
            cards_for_scroll = self.driver.find_elements(By.CSS_SELECTOR, card_selectors)
            if cards_for_scroll:
                try:
                    scrollable_div = self.driver.execute_script(
                        "let el = arguments[0]; "
                        "while (el && el !== document.body) { "
                        "  if (el.scrollHeight > el.clientHeight && el.clientHeight > 100) return el; "
                        "  el = el.parentElement; "
                        "} "
                        "return null;",
                        cards_for_scroll[0]
                    )
                except Exception:
                    pass

        if scrollable_div:
            print("[+] 리뷰 무한 스크롤 전용 컨테이너를 정상 감지하였습니다.")
        else:
            print("[!] 리뷰 스크롤 전용 컨테이너 감지 실패, body 스크롤을 시도합니다.")

        reviews_data = []
        last_card_count = 0
        same_count_retries = 0
        columns = ["place_id", "place_name", "overall_rating", "author", "rating", "date", "review_text"]

        while len(reviews_data) < target_reviews:
            # "자세히 보기" (More) 버튼 클릭
            try:
                more_buttons = self.driver.find_elements(By.CSS_SELECTOR, "button.w8rJ2d, button[aria-label*='자세히 보기'], button[aria-label*='More']")
                for btn in more_buttons[:10]:
                    if btn.is_displayed():
                        self.driver.execute_script("arguments[0].click();", btn)
            except Exception:
                pass

            # 리뷰 카드 추출
            review_cards = self.driver.find_elements(By.CSS_SELECTOR, card_selectors)
            
            for card in review_cards:
                try:
                    card_text = (card.get_attribute("textContent") or card.text or "").strip()
                    if not card_text:
                        continue

                    # 작성자 이름 추출
                    author = ""
                    for sel in [".d4r55", "button.al6P8e", ".w8rJ2d", ".X43E2e", "div.fontTitleSmall"]:
                        try:
                            elem = card.find_element(By.CSS_SELECTOR, sel)
                            txt = (elem.get_attribute("textContent") or elem.text or "").strip()
                            if txt:
                                author = txt
                                break
                        except Exception:
                            pass

                    if not author:
                        lines = [line.strip() for line in card_text.split("\n") if line.strip()]
                        if lines:
                            author = lines[0]

                    if not author or author in ["Google 번역", "Google 제공 번역"]:
                        continue

                    # 작성자 중복 방지
                    if any(r['author'] == author for r in reviews_data):
                        continue

                    # 별점 추출
                    rating = ""
                    try:
                        rating_elem = card.find_element(By.CSS_SELECTOR, "span.kvMYJc, span[aria-label*='별점'], span[aria-label*='stars'], span[aria-label*='5개']")
                        aria_label = rating_elem.get_attribute("aria-label") or ""
                        rating_match = re.search(r"(\d+)", aria_label)
                        if rating_match:
                            rating = rating_match.group(1)
                    except Exception:
                        pass

                    # 작성 시점 추출
                    date_str = ""
                    try:
                        date_elem = card.find_element(By.CSS_SELECTOR, ".rRecb, .u4R4fd")
                        date_str = (date_elem.get_attribute("textContent") or date_elem.text or "").strip()
                    except Exception:
                        pass

                    if not date_str:
                        date_match = re.search(r"(\d+\s*(?:개월|년|일|주|분|시간|month|year|day|week|hour|minute|s)\s*(?:전|ago)?)", card_text, re.IGNORECASE)
                        if date_match:
                            date_str = date_match.group(1)

                    # "원본 보기" (See original) 버튼 클릭 시도 (번역된 리뷰인 경우 원문 전환)
                    try:
                        orig_btns = card.find_elements(By.CSS_SELECTOR, "button[aria-label*='원본'], button[aria-label*='original'], button.w8rJ2d")
                        for ob in orig_btns:
                            ob_text = (ob.get_attribute("textContent") or ob.text or "").strip()
                            if "원본" in ob_text or "original" in ob_text.lower():
                                self.driver.execute_script("arguments[0].click();", ob)
                                time.sleep(0.3)
                                break
                    except Exception:
                        pass

                    # 리뷰 원문 추출
                    review_text = ""
                    try:
                        text_spans = card.find_elements(By.CSS_SELECTOR, "span.wiI7pd, span.wi80bf, div.My5Wv, .My5Wv")
                        for s in text_spans:
                            t_txt = (s.get_attribute("textContent") or s.get_attribute("innerText") or s.text or "").strip()
                            t_txt = re.sub(r"\(Google 제공 번역\)\s*", "", t_txt)
                            t_txt = re.sub(r"\(원본\)\s*", "", t_txt)
                            t_txt = re.sub(r"\(Translated by Google\)\s*", "", t_txt)
                            t_txt = re.sub(r"\(Original\)\s*", "", t_txt)
                            t_txt = re.sub(r"Google 제공 번역\s*・\s*원본 보기\(.*?\)", "", t_txt)
                            t_txt = t_txt.strip()

                            if t_txt and not t_txt.startswith("Google 제공 번역") and not t_txt.startswith("Translated by Google") and t_txt not in ["공유", "좋아요", "수정", "답글", "원본 보기", "자세히 보기", "Share", "Like"]:
                                review_text = t_txt
                                break
                    except Exception:
                        pass

                    if not review_text:
                        review_text = "(별점 전용 리뷰)"

                    reviews_data.append({
                        "place_id": place_id,
                        "place_name": place_name,
                        "overall_rating": overall_rating,
                        "author": author,
                        "rating": rating,
                        "date": date_str,
                        "review_text": review_text
                    })

                    if len(reviews_data) >= target_reviews:
                        break
                except Exception:
                    continue

            print(f"    - 현재 수집 완료 건수: {len(reviews_data)} / {target_reviews}")

            if len(reviews_data) >= target_reviews:
                print(f"[+] 목표 수량({target_reviews}개)에 도달하여 수집을 마칩니다.")
                break

            # 스크롤 내리기 (1. 마지막 카드를 스크롤 영역으로 끌어오기 + 2. 컨테이너 스크롤)
            if review_cards:
                try:
                    self.driver.execute_script("arguments[0].scrollIntoView(true);", review_cards[-1])
                except Exception:
                    pass

            if scrollable_div:
                try:
                    self.driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight;", scrollable_div)
                    self.driver.execute_script("arguments[0].scrollBy(0, 3000);", scrollable_div)
                except Exception:
                    pass

            try:
                divs = self.driver.find_elements(By.CSS_SELECTOR, "div.m6QEdf")
                for d in divs:
                    self.driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight;", d)
                    self.driver.execute_script("arguments[0].scrollBy(0, 3000);", d)
            except Exception:
                pass

            time.sleep(1.2)

            # 더 이상 로딩할 리뷰가 없는지 판별 (소규모 식당 시 빠른 종료)
            current_card_count = len(review_cards)
            if current_card_count == last_card_count:
                same_count_retries += 1
                max_retries = 3 if (total_available_num and total_available_num <= 50) else 5
                if same_count_retries >= max_retries:
                    print(f"[*] 더 이상 새로 로딩되는 리뷰가 없습니다 (총 {len(reviews_data)}건 수집 완료).")
                    break
            else:
                same_count_retries = 0

            last_card_count = current_card_count

        df = pd.DataFrame(reviews_data, columns=columns)
        return df, place_name

    def close(self):
        try:
            self.driver.quit()
        except Exception:
            pass


def main():
    parser = argparse.ArgumentParser(description="구글 맵스 Place ID 및 리뷰 자동 수집 스크레이퍼")
    parser.add_argument("--url", type=str, help="구글 맵스 식당 URL")
    parser.add_argument("--max-reviews", type=int, default=4, help="수집할 최대 리뷰 수 (기본값: 4)")
    parser.add_argument("--lang", type=str, default="en", help="구글 맵스 수집 언어 (기본값: en - 원문 수집 보장)")
    parser.add_argument("--no-headless", action="store_true", help="헤드리스 모드를 끄고 브라우저 화면을 보면서 실행 (GUI 모드)")
    
    args = parser.parse_args()

    url = args.url
    max_reviews = args.max_reviews

    if not url:
        url = input("URL을 입력하세요: ").strip()

    if not url:
        print("[!] URL이 입력되지 않았습니다. 종료합니다.")
        sys.exit(1)

    if "--max-reviews" not in sys.argv:
        rev_input = input("수집할 리뷰 개수를 입력하세요 (기본값: 4): ").strip()
        if rev_input and rev_input.isdigit():
            max_reviews = int(rev_input)
        else:
            max_reviews = 4

    scraper = GoogleMapsScraper(headless=not args.no_headless, language=args.lang)
    start_time = time.time()
    
    try:
        df, place_name = scraper.scrape(url, max_reviews=max_reviews)
        elapsed_sec = time.time() - start_time
        
        safe_place_name = re.sub(r'[\\/*?:"<>|]', "", place_name).strip().replace(" ", "_")
        if not safe_place_name:
            safe_place_name = "restaurant"

        output_dir = Path(__file__).parent / "output"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        csv_path = output_dir / f"{safe_place_name}_reviews.csv"
        df.to_csv(csv_path, index=False, encoding="utf-8-sig")
        
        if elapsed_sec >= 60:
            time_str = f"{int(elapsed_sec // 60)}분 {elapsed_sec % 60:.1f}초"
        else:
            time_str = f"{elapsed_sec:.1f}초"

        print(f"\n[+] 스크레이핑 완료!")
        print(f"[+] 총 수집 건수: {len(df)}건")
        print(f"[+] 총 소요 시간: {time_str}")
        print(f"[+] 저장 경로: {csv_path.resolve()}")

    except Exception as e:
        print(f"[!] 스크레이핑 중 오류 발생: {e}")
    finally:
        scraper.close()


if __name__ == "__main__":
    main()
