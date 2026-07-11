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

    var res = fetch(fetchUrl);
    if (res.ok) {
        var doc = res.html();
        var list = parseCards(doc);
        
        // Nếu số lượng card lấy được >= 12, giả định có trang tiếp theo
        var hasNext = list.length >= 12;
        var next = hasNext ? (parseInt(page) + 1).toString() : null;

        return Response.success(list, next);
    }
    return Response.error("Không thể tải trang: " + (res ? res.status : "không có phản hồi"));
}
