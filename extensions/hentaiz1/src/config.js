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
    var matchPath = url.match(/\/202[0-9]\/[0-9]{2}\/[a-zA-Z0-9-]+\.(?:jpg|png|webp)/);
    if (matchPath) {
        return IMAGE_URL + matchPath[0];
    }
    if (url.indexOf('/watch/') !== -1) return '';
    if (url.indexOf('//') === 0) return 'https:' + url;
    if (url.indexOf('http') === 0) return url;
    if (url.indexOf('/') === 0) return IMAGE_URL + url;
    return IMAGE_URL + '/' + url;
}

function parseCards(doc, selector) {
    if (!selector) selector = 'a[href*="/watch/"]';
    
    // Xây dựng bản đồ slug -> cover từ các thẻ script SvelteKit hydration tĩnh
    var slugToCover = {};
    doc.select("script").forEach(function(s) {
        var text = s.html() + "";
        if (text.indexOf("slug:") !== -1) {
            text = text.replace(/\\"/g, '"').replace(/\\'/g, "'");
            var parts = text.split(/slug\s*:\s*["']/);
            for (var i = 1; i < parts.length; i++) {
                var part = parts[i];
                var slugMatch = part.match(/^([^"'\s,]+)/);
                if (slugMatch) {
                    var slug = slugMatch[1];
                    var fileMatch = part.match(/filePath\s*:\s*["']([^"']+)["']/);
                    if (fileMatch) {
                        slugToCover[slug] = normalizeCoverUrl(fileMatch[1]);
                    }
                }
            }
        }
    });

    var list = [];
    var added = {}; // Để tránh trùng lặp card trong cùng một trang
    doc.select(selector).forEach(function(e) {
        var link = e.attr("href") + "";
        if (!link) return;
        link = normalizeUrl(link);
        if (added[link]) return;
        added[link] = true;

        var img = e.select("img").first();
        var title = e.select("h3, h2, h4").text() + "";
        if (!title && img) {
            title = img.attr("alt") + "";
        }
        title = title.trim();
        if (!title) return;

        var slug = decodeURIComponent(link.split('/').pop());
        // Ưu tiên lấy cover từ dữ liệu SvelteKit hydration, fallback cào DOM
        var cover = slugToCover[slug] || "";
        if (!cover && img) {
            cover = img.attr("src") || img.attr("data-src") || img.attr("data-srcset") || "";
            cover = normalizeCoverUrl(cover);
        }

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


