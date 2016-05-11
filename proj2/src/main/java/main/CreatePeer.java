package main;

import net.tomp2p.connection.Bindings;
import net.tomp2p.p2p.Peer;
import net.tomp2p.p2p.PeerMaker;
import net.tomp2p.peers.Number160;

import java.io.IOException;

public class CreatePeer {
    final private Peer peer;

    public CreatePeer(int id) throws IOException{
        Bindings b = new Bindings();
        b.addInterface("eth0");

        PeerMaker pm = new PeerMaker(Number160.createHash(id));
        pm.setPorts(6000);
        pm.setBindings(b);
        peer = pm.makeAndListen();
        peer.getConfiguration().setBehindFirewall(true);
    }

    public static void main(String[] args) {
        for (String arg : args) {
            System.out.println(arg);
        }
    }
}
