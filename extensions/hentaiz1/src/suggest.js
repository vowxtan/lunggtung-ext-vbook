load('config.js');

function execute(input) {
    var doc = Html.parse(input);
    var books = parseCards(doc);
    return Response.success(books);
}
