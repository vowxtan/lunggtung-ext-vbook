load('config.js');

// detail.js — Thông tin chi tiết một phim/video
// Contract: execute(url) → { name*, cover, host, author, description, ongoing:bool*,
//                             genres?:[{title,input,script}], suggests?:[{title,input,script}],
//                             comment?:{input,script} }
function execute(url) {
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    var res = fetch(url);
    if (!res.ok) return Response.error("Cannot load: " + res.status);

    var doc = res.html();

    // TODO: Selector tên phim
    var nameEl = doc.select("SELECTOR_TITLE").first();
    var name = (nameEl ? nameEl.text() : "") + "";

    // TODO: Selector ảnh bìa
    var coverEl = doc.select("SELECTOR_COVER_IMG").first();
    var cover = "";
    if (coverEl) {
        cover = (coverEl.attr("data-src") || coverEl.attr("src") || "") + "";
        cover = normalizeCoverUrl(cover);
    }

    // TODO: Selector tác giả
    var authorEl = doc.select("SELECTOR_AUTHOR").first();
    var author = (authorEl ? authorEl.text() : "") + "";

    // TODO: Selector trạng thái — "Đang ra" / "Hoàn thành" / "Ongoing" / "Completed"
    var statusEl = doc.select("SELECTOR_STATUS").first();
    var status = (statusEl ? statusEl.text() : "") + "";
    var ongoing = status.indexOf("Hoàn") === -1
        && status.indexOf("Completed") === -1
        && status.indexOf("Full") === -1
        && status.indexOf("完结") === -1;

    // TODO: Selector mô tả
    var descEl = doc.select("SELECTOR_DESCRIPTION").first();
    var description = (descEl ? descEl.html() : "") + "";

    // TODO: Selector thể loại
    var genres = [];
    doc.select("SELECTOR_GENRE_LINKS").forEach(function (el) {
        var gTitle = el.text() + "";
        var gHref = (el.attr("href") || "") + "";
        if (!gTitle || !gHref) return;
        if (!gHref.startsWith("http")) gHref = BASE_URL + gHref;
        genres.push({ title: gTitle, input: gHref, script: "gen.js" });
    });

    // TODO: Gợi ý (tùy chọn) — link API hoặc search theo tên
    var suggests = [];
    // Cách 1: Dùng search.js fallback
    suggests.push({ title: "Phim đề xuất", input: name, script: "search.js" });

    // TODO: Bình luận (tùy chọn) — cần episode/comment ID
    // Trả về comment (object ĐƠN, KHÔNG phải mảng comments)
    var comment = undefined;
    // Nếu có episodeId, dùng:
    // comment = { input: episodeId, script: "comment.js" };

    return Response.success({
        name: name,
        cover: cover,
        host: BASE_URL,
        author: author,
        description: description,
        ongoing: ongoing,
        format: "series",
        genres: genres.length > 0 ? genres : undefined,
        suggests: suggests.length > 0 ? suggests : undefined,
        comment: comment  // object đơn, KHÔNG phải mảng!
    });
}
