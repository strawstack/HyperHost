(() => {

    const REMOVE_TIME_MS = 4000;

    const peer = new Peer();
    const peer_list  = {};
    const peer_state = {};
    const peer_time  = {};
    
    peer.on('open', function(self_code) {
        const invite_url = `file://${window.location.pathname}#${self_code}`; 
        console.log(`invite: ${invite_url}`);

        // Add self to trackers
        peer_list[self_code] = {
            code: self_code,
            conn: null
        };
        peer_state[self_code] = {
            number: 0,
        };
        peer_time[self_code] = Date.now();

        // Contact another peer
        const invite_code = getCodeFromURL();
        if (invite_code !== "") {
            const conn = peer.connect(invite_code);
            onOpen(conn, invite_code);
            onData(conn, conn.peer);
        }

        // Another peer contacts you
        peer.on('connection', function(conn) {
            onOpen(conn, conn.peer);
            onData(conn, conn.peer);
        });

    });

    function onOpen(conn, peer_code) {
        conn.on('open', function() {
            peer_list[peer_code] = {
                code: peer_code,
                conn: conn
            };
            updatePeerTime(peer_code);
            conn.send({
                peer_list: Object.keys(peer_list),
                peer_state: peer_state
            });
        });
    }

    function onData(conn, peer_code) {
        conn.on('data', function(data) {
            updatePeerTime(peer_code);

            // Gather all the peer info you can
            for (let peer_code in data.peer_list) {
                if (!(peer_code in peer_list)) {
                    peer_list[peer_code] = {
                        code: peer_code,
                        conn: null
                    };
                }
            }

            if (isSelfHost()) {
                peer_state[peer_code] = data.peer_state[peer_code];

            } else {

                // Delete peers not listed by host
                for (let peer_code in peer_list) {
                    if (!(peer_code in data.peer_list)) {
                        removePeer(peer_code);
                    }
                }

                for (let peer_code in data.peer_list) {
                    if (peer_code === self_code) continue;
                    peer_state[peer_code] = data.peer_state[peer_code];
                }
            }
            
        });
    }

    function getCodeFromURL() {
        return window.location.hash.substring(1);
    }

    function updatePeerTime(code) {
        peer_time[code] = Date.now();
    }

    function removePeer(code) {
        const conn = peer_list[code].conn;
        if (conn !== null) conn.close();
        delete peer_list[code];
        delete peer_state[code];
        delete peer_time[code];
    }

    function isSelfHost() {
        const lst = Object.keys(peer_list);
        lst.sort();
        return self_code === lst[0];
    }

    function getHost() {
        const lst = Object.keys(peer_list);
        lst.sort();
        return lst[0];
    }

    function createMaybeAndSend(code) {
        if (peer_list[code].conn === null) {
            const conn = peer.connect(code);
            peer_list[code].conn = conn;
            onOpen(conn, conn.peer);
            onData(conn, conn.peer);

        } else {
            const conn = peer_list[code].conn;
            conn.send({
                peer_list: Object.keys(peer_list),
                peer_state: peer_state
            });
        }
    }

    // Remove peers you haven't heard from in awhile
    setInterval(() => {

        if (isSelfHost()) {
            const now = Date.now();
            const removals = [];
            for (let peer_code in peer_time) {
                if (peer_code === self_code) continue;
                if (now - peer_time[peer_code] > REMOVE_TIME_MS) {
                    removals.push(peer_code);
                }
            }
    
            for (let peer_code of removals) {
                removePeer(peer_code);
            }

            for (let peer_code in peer_list) {
                if (peer_code === self_code) continue;
                createMaybeAndSend(peer_code);
            }

        } else {
            const host_code = getHost();
            createMaybeAndSend(host_code);
            
        }

    }, REMOVE_TIME_MS/2);

    // DEBUG: print values
    window.addEventListener("keydown", e => {
        if (e.code == "Space") {
            console.log("peer list");
            console.log(peer_list);

            console.log("peer state");
            console.log(peer_state);
            
            console.log("peer time");
            console.log(peer_time);
        }
    });

})();