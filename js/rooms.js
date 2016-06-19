var data = new Wilddog('https://52gobang.wilddogio.com/');
var roomsData = data.child("rooms");
$(function() {
	roomsData.on("value", function(snapshot, prev) {
		$(".weui_grids").html("");
		if (snapshot.val()) {
			for (name in snapshot.val()) {
				var dom = $('<a href="game.html?' + name + '" class="weui_grid js_grid" data-id="room' + name + '"></a>');
				var nameDom = $('<p class="weui_grid_label">' + name + '</p>');
				dom.append(nameDom);
				$(".weui_grids").append(dom);
			}
		}
	});
});