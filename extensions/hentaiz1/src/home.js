load('config.js');

function execute() {
    return Response.success([
        {
            title: "Mới cập nhật",
            input: BASE_URL + "/browse/__data.json?sort=publishedAt_desc&page={{page}}&limit=24&animationType=TWO_D&contentRating=ALL&isTrailer=false&year=ALL&x-sveltekit-invalidated=001",
            script: "gen.js"
        },
        {
            title: "Vietsub",
            input: BASE_URL + "/genres/vietsub/__data.json?page={{page}}&x-sveltekit-invalidated=001",
            script: "gen.js"
        },
        {
            title: "3D Hentai",
            input: BASE_URL + "/genres/3d/__data.json?page={{page}}&x-sveltekit-invalidated=001",
            script: "gen.js"
        },
        {
            title: "Vanilla",
            input: BASE_URL + "/genres/vanilla/__data.json?page={{page}}&x-sveltekit-invalidated=001",
            script: "gen.js"
        }
    ]);
}
