def test_setup_guide_loads_and_toc(page):
    # Ensure the site is being served at http://localhost:8001
    page.goto("http://localhost:8001/setup-guide.html")

    assert page.locator('#markdown-content').is_visible()

    first_toc = page.locator('#toc a').first
    assert first_toc.is_visible()

    href = first_toc.get_attribute('href')
    target_id = href.replace('#', '')

    first_toc.click()
    assert page.locator(f"#{target_id}").is_visible()
