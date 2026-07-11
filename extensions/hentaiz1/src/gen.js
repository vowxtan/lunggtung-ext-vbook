load('config.js');

function execute(url, page) {
    if (!page) page = '1';
    var fetchUrl = url;
    
    // Nếu không phải trang 1, chèn query parameter page
    if (page !== '1') {
        if (fetchUrl.indexOf('?') > 0) {
            fetchUrl += '&page=' + page;
        } else {
            fetchUrl += '?page=' + page;
        }
    }

    var res = fetch(fetchUrl, { headers: { "User-Agent": UserAgent.chrome() } });
    if (res && res.ok) {
        var html = res.text();
        var svelteData = parseSvelteKitData(html);
        if (svelteData) {
            var list = parseEpisodes(svelteData);
            if (list.length > 0) {
                var hasNext = list.length >= 12;
                var next = hasNext ? (parseInt(page) + 1).toString() : null;

                return Response.success(list, next);
            }
        }
    }
    
    return Response.error("Không thể tải danh sách phim từ: " + fetchUrl);
}
