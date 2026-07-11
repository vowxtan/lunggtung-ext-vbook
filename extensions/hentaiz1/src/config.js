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
    if (url.indexOf('/watch/') !== -1) return '';
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

        var title = e.select("h3, h2, h4").text() + "";
        if (!title) {
            title = img.attr("alt") + "";
        }
        title = title.trim();
        if (!title) return;

        var cover = img.attr("src") || img.attr("data-src") || img.attr("data-srcset") || "";
        cover = normalizeCoverUrl(cover);

        var episode = "";
        e.select("span, div, p").forEach(function(el) {
            var txt = el.text() + "";
            if (txt.indexOf("Tập") !== -1 || txt.indexOf("Full") !== -1) {
                episode = txt;
            }
        });
        
        if (!episode) {
            var descNode = e.select("p").first();
            if (descNode) {
                episode = descNode.text();
            }
        }

        list.push({
            name: title,
            link: link,
            cover: cover,
            description: episode.trim(),
            host: BASE_URL
        });
    });
    return list;
}


