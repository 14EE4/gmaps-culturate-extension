import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

options = Options()
options.add_argument('--headless=new')
options.add_argument('--lang=en')
options.add_argument('--window-size=1920,1080')
options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')
driver = webdriver.Chrome(options=options)

url = "https://www.google.com/maps/place/Jimmy+John%27s/@41.8812,-87.6291,17z/data=!3m1!4b1!4m6!3m5!1s0x880e2cb039bb3b19:0x8797f1f9e2ab692d!8m2!3d41.8812!4d-87.6291!16s%2Fg%2F11b6v8m4b9"
driver.get(url)
time.sleep(5)

print("Current URL:", driver.current_url)
print("Title:", driver.title)
print("HTML snippet:", driver.page_source[:500])

driver.quit()
