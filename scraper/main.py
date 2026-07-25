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
    def __init__(self, headless=False, language="ko"):
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

        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=self.options)
        self.wait = WebDriverWait(self.driver, 10)

    def handle_consent_popups(self):
        """동의/쿠키 팝업 처리"""
        try:
            buttons = self.driver.find_elements(
                By.XPATH, 
                "//button[contains(text(), '모두 수락') or contains(text(), 'Accept all') or contains(text(), '동의')]"
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

    def format_url(self, url: str) -> str:
        """URL에 hl=ko 파라미터를 보장하여 한국어로 구글 맵스 로드"""
        if "hl=" not in url:
            if "?" in url:
                return f"{url}&hl={self.language}"
            else:
                return f"{url}?hl={self.language}"
        return url

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
                        txt = elem.text.strip()
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
        formatted_url = self.format_url(url)
        print(f"[+] Google Maps 접속 중: {formatted_url}")
        self.driver.get(formatted_url)
        
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
                txt = r.text.strip()
                if re.match(r"^\d(\.\d)?$", txt):
                    overall_rating = txt
                    break
        except Exception:
            pass

        try:
            review_cnt_elems = self.driver.find_elements(By.CSS_SELECTOR, "div.fontBodySmall, span[aria-label*='리뷰'], button[data-tab-index='1'], span[aria-label*='reviews']")
            for c in review_cnt_elems:
                txt = c.text.strip()
                if txt and ("리뷰" in txt or "개" in txt or "reviews" in txt.lower()):
                    total_reviews_count = txt
                    break
        except Exception:
            pass

        print(f"[+] 전체 평점: {overall_rating} | 총 리뷰 정보: {total_reviews_count}")

        # 4. 리뷰 탭 이동 (이미 리뷰 페이지 접속 여부 감지)
        print("[+] 리뷰 탭 상태 감지 및 이동 중...")
        existing_cards = self.driver.find_elements(By.CSS_SELECTOR, "div.jJc9Ad, div.Gvh3ud, div[data-review-id]")
        
        if len(existing_cards) > 0:
            print(f"[+] 이미 리뷰 페이지에 직접 접속되어 있습니다 (초기 감지 리뷰: {len(existing_cards)}개). 탭 클릭을 생략합니다.")
        else:
            tab_clicked = False
            time.sleep(2)
            
            for sel in ["button[data-tab-index='1']", "button.hh2ftd", "button[aria-label*='리뷰']", "button[aria-label*='Reviews']"]:
                try:
                    btns = self.driver.find_elements(By.CSS_SELECTOR, sel)
                    for b in btns:
                        label = (b.get_attribute("aria-label") or "") + " " + b.text
                        if ("리뷰" in label or "Reviews" in label) and b.is_displayed():
                            self.driver.execute_script("arguments[0].scrollIntoView(true);", b)
                            self.driver.execute_script("arguments[0].click();", b)
                            tab_clicked = True
                            print(f"[+] 리뷰 탭 클릭 완료 ({label.strip()})")
                            time.sleep(4)
                            break
                    if tab_clicked:
                        break
                except Exception:
                    pass

            if not tab_clicked:
                print("[*] 리뷰 탭 클릭 생략 (기본 로드 영역 진행)")

        # 5. 리뷰 스크롤 컨테이너 감지 (리뷰 카드의 조상 m6QEdf 정교한 탐색)
        scrollable_div = None
        time.sleep(2)
        initial_cards = self.driver.find_elements(By.CSS_SELECTOR, "div.jJc9Ad, div.Gvh3ud, div[data-review-id]")
        
        if initial_cards:
            try:
                scrollable_div = self.driver.execute_script(
                    "let el = arguments[0]; "
                    "while (el && el !== document.body) { "
                    "  if (el.scrollHeight > el.clientHeight && el.clientHeight > 100) return el; "
                    "  el = el.parentElement; "
                    "} "
                    "return null;",
                    initial_cards[0]
                )
            except Exception as e:
                print(f"[!] JS 조상 스크롤 컨테이너 탐색 예외: {e}")

        if not scrollable_div:
            # 폴백 선택자 탐색
            for d in self.driver.find_elements(By.CSS_SELECTOR, "div.m6QEdf"):
                try:
                    scroll_h = self.driver.execute_script("return arguments[0].scrollHeight", d)
                    client_h = self.driver.execute_script("return arguments[0].clientHeight", d)
                    if scroll_h and client_h and scroll_h > client_h and client_h > 100:
                        scrollable_div = d
                        break
                except Exception:
                    pass

        if scrollable_div:
            print("[+] 리뷰 스크롤 전용 컨테이너를 정상 감지하였습니다.")
        else:
            print("[!] 리뷰 스크롤 전용 컨테이너 감지 실패, body 스크롤을 시도합니다.")

        print(f"[+] 리뷰 데이터 수집 시작 (목표 수량: {max_reviews}개)...")
        reviews_data = []
        last_card_count = 0
        same_count_retries = 0
        columns = ["place_id", "place_name", "overall_rating", "author", "rating", "date", "review_text"]

        while len(reviews_data) < max_reviews:
            # "자세히 보기" (More) 버튼 클릭
            try:
                more_buttons = self.driver.find_elements(By.CSS_SELECTOR, "button.w8rJ2d, button[aria-label*='자세히 보기'], button[aria-label*='More']")
                for btn in more_buttons[:10]:
                    if btn.is_displayed():
                        self.driver.execute_script("arguments[0].click();", btn)
            except Exception:
                pass

            # 리뷰 카드 추출
            review_cards = self.driver.find_elements(By.CSS_SELECTOR, "div.jJc9Ad, div.Gvh3ud, div[data-review-id]")
            
            for card in review_cards:
                try:
                    card_text = card.text.strip()
                    if not card_text:
                        continue

                    # 작성자 이름 추출
                    author = ""
                    for sel in [".d4r55", "button.al6P8e", ".w8rJ2d", ".X43E2e", "div.fontTitleSmall"]:
                        try:
                            elem = card.find_element(By.CSS_SELECTOR, sel)
                            txt = elem.text.strip()
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
                        date_str = date_elem.text.strip()
                    except Exception:
                        pass

                    if not date_str:
                        date_match = re.search(r"(\d+\s*(?:개월|년|일|주|분|시간)\s*전)", card_text)
                        if date_match:
                            date_str = date_match.group(1)

                    # 리뷰 원문 추출
                    review_text = ""
                    try:
                        text_elem = card.find_element(By.CSS_SELECTOR, ".My5Wv, .wi80bf")
                        review_text = text_elem.text.strip()
                        review_text = re.sub(r"\(Google 제공 번역\)\s*", "", review_text)
                        review_text = re.sub(r"\(원본\)\s*", "", review_text)
                    except Exception:
                        pass

                    if not review_text and "\n" in card_text:
                        lines = card_text.split("\n")
                        if len(lines) >= 3:
                            review_text = lines[-1].strip()

                    reviews_data.append({
                        "place_id": place_id,
                        "place_name": place_name,
                        "overall_rating": overall_rating,
                        "author": author,
                        "rating": rating,
                        "date": date_str,
                        "review_text": review_text
                    })

                    if len(reviews_data) >= max_reviews:
                        break
                except Exception:
                    continue

            print(f"    - 현재 수집 완료 건수: {len(reviews_data)} / {max_reviews}")

            if len(reviews_data) >= max_reviews:
                break

            # 스크롤 내리기
            if scrollable_div:
                self.driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight", scrollable_div)
            else:
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")

            time.sleep(2)

            # 더 이상 로딩할 리뷰가 없는지 판별
            current_card_count = len(review_cards)
            if current_card_count == last_card_count:
                same_count_retries += 1
                if same_count_retries >= 5:
                    print("[*] 더 이상 새로 로딩되는 리뷰가 없어 수집을 마칩니다.")
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
    parser.add_argument("--max-reviews", type=int, default=100, help="수집할 최대 리뷰 수 (기본값: 100)")
    parser.add_argument("--headless", action="store_true", help="헤드리스 모드로 실행")
    
    args = parser.parse_args()

    url = args.url
    if not url:
        url = input("URL을 입력하세요: ").strip()

    if not url:
        print("[!] URL이 입력되지 않았습니다. 종료합니다.")
        sys.exit(1)

    scraper = GoogleMapsScraper(headless=args.headless)
    
    try:
        df, place_name = scraper.scrape(url, max_reviews=args.max_reviews)
        
        safe_place_name = re.sub(r'[\\/*?:"<>|]', "", place_name).strip().replace(" ", "_")
        if not safe_place_name:
            safe_place_name = "restaurant"

        output_dir = Path(__file__).parent / "output"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        csv_path = output_dir / f"{safe_place_name}_reviews.csv"
        df.to_csv(csv_path, index=False, encoding="utf-8-sig")
        
        print(f"\n[+] 스크레이핑 완료!")
        print(f"[+] 총 수집 건수: {len(df)}건")
        print(f"[+] 저장 경로: {csv_path.resolve()}")

    except Exception as e:
        print(f"[!] 스크레이핑 중 오류 발생: {e}")
    finally:
        scraper.close()


if __name__ == "__main__":
    main()
