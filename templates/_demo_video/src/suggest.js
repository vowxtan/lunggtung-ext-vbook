load('config.js');

// suggest.js — Phim đề xuất / liên quan
// Contract: execute(input) → [{ name*, link*, cover?, description?, host? }]
// input: URL API hoặc chuỗi search
function execute(input) {
    var res = fetch(input, { headers: { "User-Agent": UserAgent.chrome() } });
    if (!res.ok) return Response.error("Lỗi: " + res.status);

    // TODO: Parse response — có thể là HTML, JSON, hoặc SvelteKit devalue
    var items = [];

    // Cách 1: Parse HTML
    // var doc = res.html();
    // doc.select("SELECTOR_SUGGEST_ITEM").forEach(function (el) { ... });

    // Cách 2: Parse JSON API
    // var root = JSON.parse(res.text() + "");
    // ... map items

    return Response.success(items);
}
