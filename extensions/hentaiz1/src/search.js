load('config.js');

function execute(key, page) {
    if (!page) page = '1';
    
    // Encode từ khóa tìm kiếm
    var searchUrl = BASE_URL + "/browse?q=" + encodeURIComponent(key);
    
    if (page !== '1') {
        searchUrl += "&page=" + page;
    }

    var res = fetch(searchUrl, { headers: { "User-Agent": UserAgent.chrome() } });
    var doc = null;
    if (res && res.ok) {
        doc = res.html();
    } else {
        var browser = Engine.newBrowser();
        try {
            doc = browser.launch(searchUrl, 8000);
        } finally {
            browser.close();
        }
    }

    if (doc) {
        var list = parseCards(doc);
        
        // Nếu số lượng kết quả lấy được >= 12, giả định có trang kế tiếp
        var hasNext = list.length >= 12;
        var next = hasNext ? (parseInt(page) + 1).toString() : null;

        return Response.success(list, next);
    }
    
    return Response.error("Tìm kiếm thất bại: " + searchUrl);
}
