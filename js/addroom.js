var data = new Wilddog('https://52gobang.wilddogio.com/');

function addRoom() {
	var roomName = $("#roomName").val();
	if (!roomName) {
		$.toast("请填写完整", "cancel");
		return;
	}
	data.child("rooms/" + roomName).once("value", function(snapshot) {
		if (snapshot.val()) {
			$.toast("房间已经存在", "cancel");
		} else {
			location.href = "game.html?" + roomName;
		}
	});
}