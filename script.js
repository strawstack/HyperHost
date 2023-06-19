(() => {

    const peer = new Peer();
    const peer_list = {};
    const peer_state = {};
    const self_state = {
        number: 0,
    };
    
    peer.on('open', function(self_code) {
        console.log(`Invite URL:`);
        console.log(`file://${window.location.pathname}#${self_code}`);

        const invite_code = getCodeFromURL();
        if (invite_code !== "") {

            const conn = peer.connect(invite_code);

            conn.on('open', function() {
                peer_list[invite_code] = {
                    code: invite_code,
                    conn: conn
                };
                conn.send(self_state);
            });

            conn.on('data', function(state) {
                console.log(state);
                peer_state[conn.peer] = state;
            });
        }

        peer.on('connection', function(conn) {
            
            conn.on('open', function() {
                peer_list[conn.peer] = {
                    code: conn.peer,
                    conn: conn
                };
                conn.send(self_state);
            });

            conn.on('data', function(state) {
                console.log(state);
                peer_state[conn.peer] = state;
            });
        });

    });

    function getCodeFromURL() {
        return window.location.hash.substring(1);
    }

    // DEBUG: print state and peer list
    window.addEventListener("keydown", e => {
        if (e.code == "Space") {
            console.log(peer_list);
            console.log(peer_state);
        }
    });

})();