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

function decodeSvelteKitString(str) {
    if (!str) return "";
    try {
        // Giải mã \uXXXX
        str = str.replace(/\\u([a-fA-F0-9]{4})/g, function(match, grp) {
            return String.fromCharCode(parseInt(grp, 16));
        });
        // Giải mã các ký tự escape thông thường
        str = str.replace(/\\(.)/g, "$1");
    } catch (e) {}
    return str;
}

function cleanSlug(slug) {
    if (!slug) return "";
    slug = slug + "";
    slug = slug.toLowerCase();
    
    // Đồng bộ các ký tự tiếng Nhật NFC và NFD có dấu bằng cách đưa về dạng phân rã và loại bỏ dấu phụ
    var nfcToNfd = {
        'が': 'か\u3099', 'ぎ': 'ki\u3099', 'ぐ': 'く\u3099', 'げ': 'け\u3099', 'ご': 'こ\u3099',
        'ざ': 'さ\u3099', 'じ': 'し\u3099', 'ず': 'す\u3099', 'ぜ': 'se\u3099', 'ぞ': 'そ\u3099',
        'だ': 'た\u3099', 'ぢ': 'ち\u3099', 'づ': 'つ\u3099', 'で': 'て\u3099', 'ど': 'to\u3099',
        'ば': 'は\u3099', 'bi': 'ひ\u3099', 'ぶ': 'ふ\u3099', 'be': 'へ\u3099', 'ぼ': 'ほ\u3099',
        'ぱ': 'は\u309a', 'pi': 'ひ\u309a', 'ぷ': 'ふ\u309a', 'ぺ': 'へ\u309a', 'ぽ': 'ほ\u309a',
        'ガ': 'カ\u3099', 'ギ': 'キ\u3099', 'グ': 'ク\u3099', 'ゲ': 'ケ\u3099', 'ゴ': 'コ\u3099',
        'ザ': 'サ\u3099', 'ジ': 'シ\u3099', 'ズ': 'ス\u3099', 'ゼ': 'セ\u3099', 'ゾ': 'ソ\u3099',
        'ダ': 'タ\u3099', 'ヂ': 'チ\u3099', 'ヅ': 'ツ\u3099', 'デ': 'テ\u3099', 'ド': 'ト\u3099',
        'バ': 'ハ\u3099', 'ビ': 'ヒ\u3099', 'ブ': 'フ\u3099', 'ベ': 'ヘ\u3099', 'ボ': 'ホ\u3099',
        'パ': 'ハ\u309a', 'ピ': 'ヒ\u309a', 'プ': 'フ\u309a', 'ペ': 'ヘ\u309a', 'ポ': 'ホ\u309a'
    };
    for (var nfc in nfcToNfd) {
        slug = slug.replace(new RegExp(nfc, 'g'), nfcToNfd[nfc]);
    }
    // Loại bỏ dấu phụ tiếng Nhật
    slug = slug.replace(/[\u3099\u309a]/g, "");
    
    // Loại bỏ tất cả các loại dấu nháy
    slug = slug.replace(/['"`´’‘]/g, "");
    // Thay thế các loại vòng tròn/chữ o/chữ Nhật o về chữ o thường
    slug = slug.replace(/[○〇]/g, "o");
    // Loại bỏ các dấu gạch ngang/gạch dưới/khoảng trắng
    slug = slug.replace(/[-_\s]/g, "");
    return slug;
}

function parseCards(doc, selector) {
    if (!selector) selector = 'a[href*="/watch/"]';
    
    // Xây dựng bản đồ slug -> cover từ các thẻ script SvelteKit hydration tĩnh
    var slugToCover = {};
    doc.select("script").forEach(function(s) {
        var text = s.html() + "";
        if (text.indexOf("slug") !== -1) {
            text = decodeSvelteKitString(text);
            var parts = text.split(/slug\s*:\s*["']/);
            for (var i = 1; i < parts.length; i++) {
                var part = parts[i];
                var slugMatch = part.match(/^([^"'\s,]+)/);
                if (slugMatch) {
                    var slug = slugMatch[1];
                    var fileMatch = part.match(/filePath\s*:\s*["']([^"']+)["']/);
                    if (fileMatch) {
                        slugToCover[cleanSlug(slug)] = normalizeCoverUrl(fileMatch[1]);
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
        var cover = slugToCover[cleanSlug(slug)] || "";
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


