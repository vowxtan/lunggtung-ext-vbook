let BASE_URL = "https://hentaiz1.com";
let IMAGE_URL = "https://storage.haiten.org";
try { if (CONFIG_URL) BASE_URL = CONFIG_URL; } catch (e) {}

function normalizeUrl(url) {
    if (!url) return '';
    url = url + "";
    if (url.indexOf('//') === 0) return 'https:' + url;
    if (url.indexOf('/') === 0) return BASE_URL + url;
    return url;
}

function normalizeCoverUrl(url) {
    if (!url) return '';
    url = url + "";
    if (url.indexOf('//') === 0) return 'https:' + url;
    if (url.indexOf('http') === 0) return url;
    if (url.indexOf('/') === 0) return IMAGE_URL + url;
    return IMAGE_URL + '/' + url;
}

function parseCards(doc, selector) {
    if (!selector) selector = 'a[href*="/watch/"]';
    var list = [];
    var added = {}; // Để tránh trùng lặp card trong cùng một trang
    doc.select(selector).forEach(function(e) {
        var img = e.select("img").first();
        if (!img) return;
        var link = e.attr("href") + "";
        if (!link) return;
        link = normalizeUrl(link);
        if (added[link]) return;
        added[link] = true;

        var title = e.select("h4").text() + "";
        var textLines = (e.text() + "").split('\n').map(function(t) { return t.trim(); }).filter(function(t) { return t !== ''; });
        if (!title) {
            title = textLines[1] ? textLines[1] : (textLines[0] ? textLines[0] : "");
        }
        var cover = img.attr("src") + "" || img.attr("data-src") + "" || img.attr("data-srcset") + "";
        var episode = textLines[0] ? textLines[0] : "";

        list.push({
            name: title.trim(),
            link: link,
            cover: normalizeCoverUrl(cover),
            description: episode.trim(),
            host: BASE_URL
        });
    });
    return list;
}
