var wilddog = new Wilddog('https://52gobang.wilddogio.com/');
var vm = new Vue({
	el: "body",
	grid: [],
	data: {
		roomId: "",

		// 当前玩家的uid
		uid: "",

		// 当前用户是玩家几？ 1 or 2
		playerNumber: 1,

		// 当前落子玩家
		currentPlayer: 1,

		isWatching: false,

		tips: "等待玩家加入...",

		// 锁定用户，不允许落子
		lockMe: false
	},
	created: function() {
		var p_room = location.search;
		if (!p_room) location.href = "rooms.html";
		p_room = p_room.substr(1);
		p_room = decodeURI(p_room);
		this.roomId = p_room;

		wilddog.onAuth(this.onAuth);
	},
	methods: {
		// 初始化棋盘
		initGrids: function() {
			this.grid = [];
			for (var i = 0; i < 15; i++) {
				this.grid.push([]);
				for (var j = 0; j < 15; j++) {
					this.grid[i].push(0);
				}
			}
		},
		// 棋盘落子
		addChessman: function(x, y, playerNumber) {
			x = parseInt(x);
			y = parseInt(y);
			var chessman = $("<div class='chessman'></div>");
			chessman.css("left", x * 35 + 10 + "px");
			chessman.css("top", y * 35 + 10 + "px");
			chessman.attr("id", "c_" + x + "_" + y);
			if (playerNumber == 1) chessman.addClass("black");
			$("#board").append(chessman);
			this.check(x, y);
		},
		// 检查是否登录
		onAuth: function(authData) {
			if (!authData) {
				wilddog.authAnonymously(function(err, data) {
					console.log(data)
				});
			}
			console.log("当前用户：" + authData.uid);
			this.uid = authData.uid;
			this.loadRoomInfo();
			this.loadGrid();
		},
		onAddChessman: function(event) {
			if (this.lockMe) return;
			if ($(event.target).attr("id") != "board") return;

			var gridSize = 535 * 0.065;
			var self = this;
			var x = event.offsetX - 5,
				y = event.offsetY - 5;

			x = parseInt(x / gridSize);
			y = parseInt(y / gridSize)

			if ($("#c_" + x + "_" + y).length > 0) {
				return;
			}

			var nextPlayer = self.currentPlayer == 2 ? 1 : 2;
			console.log(nextPlayer);
			wilddog.child("rooms/" + self.roomId + "/current").set(nextPlayer, function(err) {
				if (!err) {
					// 落子权交给对手
					wilddog.child("grids/" + self.roomId + "/" + x + "-" + y).set(self.playerNumber);
				}
			});
		},
		loadRoomInfo: function() {
			var self = this;
			// 房间信息
			wilddog.child("rooms/" + self.roomId).on("value", function(snapshot) {
				// 如果房间不存在，则创建
				var info = snapshot.val();
				if (info == null) {
					self.createRoom(info);
					return;
				}
				self.currentPlayer = info.current;
				self.lockMe = true;
				// 我是否加入了游戏
				if (self.uid && (info.player1 == self.uid || info.player2 == self.uid)) {
					// 是否还差玩家
					if (self.isNeedPlayer(info)) {
						self.tips = "正在等待玩家加入...";
					} else {
						if (info.current == self.playerNumber) {
							self.tips = (self.playerNumber == 1 ? "我是黑方" : "我是白方") + ":该我落子了...";
							self.lockMe = false;
						} else {
							self.tips = "对方正在思考中...";
							if (!info.current) {
								self.tips = "随意落子开局";
								self.lockMe = false;
							}
						}
					}
				} else {
					// 是否还差玩家
					if (self.isNeedPlayer(info)) {
						// 如果差玩家1就加入玩家1，否则加入玩家2
						self.join(!info.player1 ? 1 : 2);
					} else {
						// 是否正在观战
						if (self.isWatching) {
							self.watching(info);
						} else {
							if (confirm("当前房间玩家数量已满，是否要观战？")) {
								self.isWatching = true;
								self.watching(info);
								return;
							} else {
								location.href = "rooms.html";
								return;
							}
						}
					}
				}
			});
		},
		// 是否还差玩家
		isNeedPlayer: function(info) {
			return !info.player1 || !info.player2;
		},
		// 观战
		watching: function(info) {
			this.tips = "正在观战:" + (info.current == 1 ? "黑方落子..." : "白方落子...");
		},
		createRoom: function(info) {
			var self = this;
			console.log("房间 " + self.roomId + " 不存在，创建中...");
			var room = {
				name: self.roomId
			};
			wilddog.child("rooms/" + self.roomId).set(room, function(err) {
				if (err) {
					console.error("创建房间失败！");
				} else {
					wilddog.child("rooms/" + self.roomId).onDisconnect().remove();
					wilddog.child("grids/" + self.roomId).onDisconnect().remove();
				}
			});
		},
		loadGrid: function() {
			this.initGrids();
			var self = this;
			var grid = wilddog.child("grids/" + this.roomId);

			grid.on("child_added", function(snapshot) {
				var v = snapshot.key().split("-");
				self.addChessman(v[0], v[1], snapshot.val());
			});

			grid.on("child_removed", function(snapshot) {
				var v = snapshot.key().split("-");
				self.grid[v[0], v[1]] = 0;
				$("#c_" + v[0] + "_" + v[1]).remove();
			});
		},
		join: function(num) {
			var self = this;
			self.playerNumber = num;
			var room = wilddog.child("rooms/" + this.roomId);
			room.child("player" + num).set(
				self.uid,
				function(err) {
					if (err) {
						$.toast("加入失败！");
					} else {
						$.toast("加入成功！");
					}
				});
		},
		// 从一个点判断是否连成一条线（最简单的五子棋胜利判断算法）
		check: function(x, y) {
			var count = 0,
				isBakck = $("#c_" + x + "_" + y).hasClass("black"),
				i = 0,
				j = 0,
				chessman;

			// 向左搜索
			for (count = 0, i = x; i < 15; i++) {
				chessman = $("#c_" + i + "_" + y);
				if (chessman.length == 0) break;
				if (chessman.hasClass("black") != isBakck)
					break;
				count++;
			}

			if (count < 5) {
				// 向右搜索
				for (count = 0, i = x; i >= 0; i--) {
					chessman = $("#c_" + i + "_" + y);
					if (chessman.length == 0) break;
					if (chessman.hasClass("black") != isBakck)
						break;
					count++;
				}
			}

			if (count < 5) {
				// 向上搜索
				for (count = 0, i = y; i >= 0; i--) {
					chessman = $("#c_" + x + "_" + i);
					if (chessman.length == 0) break;
					if (chessman.hasClass("black") != isBakck)
						break;
					count++;
				}
			}

			if (count < 5) {
				// 向下搜索
				for (count = 0, i = y; i < 15; i++) {
					chessman = $("#c_" + x + "_" + i);
					if (chessman.length == 0) break;
					if (chessman.hasClass("black") != isBakck)
						break;
					count++;
				}
			}

			if (count < 5) {
				// 向左上搜索
				for (count = 0, i = y, j = y; i >= 0 && j >= 0; i--, j--) {
					chessman = $("#c_" + i + "_" + j);
					if (chessman.length == 0) break;
					if (chessman.hasClass("black") != isBakck)
						break;
					count++;
				}
			}

			if (count < 5) {
				// 向左下搜索
				for (count = 0, i = y, j = y; i >= 0 && j < 15; i--, j++) {
					chessman = $("#c_" + i + "_" + j);
					if (chessman.length == 0) break;
					if (chessman.hasClass("black") != isBakck)
						break;
					count++;
				}
			}

			if (count < 5) {
				// 向右上搜索
				for (count = 0, i = y, j = y; i < 15 && j >= 0; i++, j--) {
					chessman = $("#c_" + i + "_" + j);
					if (chessman.length == 0) break;
					if (chessman.hasClass("black") != isBakck)
						break;
					count++;
				}
			}

			if (count < 5) {
				// 向右下搜索
				for (count = 0, i = y, j = y; i < 15 && j < 15; i++, j++) {
					chessman = $("#c_" + i + "_" + j);
					if (chessman.length == 0) break;
					if (chessman.hasClass("black") != isBakck)
						break;
					count++;
				}
			}

			if (count >= 5) {
				$.toast((isBakck ? "黑棋" : "白棋") + "获胜！");
				this.lockMe = true;
				this.tips = (isBakck ? "黑棋" : "白棋") + "获胜！";
			}
		},
		clear: function() {
			wilddog.child("grids/" + this.roomId).remove();
			wilddog.child("rooms/" + this.roomId + "/current").remove();
		}
	}
});