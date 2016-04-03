package Protocol.Handler;

import Listener.MCastSocketListener;
import Protocol.Chunk.Chunk;
import Protocol.Message.Message;
import Protocol.Message.MessageType;
import Service.Database;
import Utils.Log;
import Utils.Utils;

import java.util.ArrayList;
import java.util.HashMap;

public class BackupHandler extends Handler{

    MCastSocketListener mc;

    HashMap<Chunk, Boolean> watchlist = new HashMap<>();
    ArrayList<Chunk> blacklist = new ArrayList<>();

    public BackupHandler(int _peerID, MCastSocketListener _mc) {
        super(_peerID);
        mc = _mc;
    }

    @Override
    public void handle(Message m) {
        if (m.type != MessageType.PUTCHUNK) {
            return;
        }
        if (m.senderID == peerID) return;

        Chunk chunk = new Chunk(m);

        if (watching(chunk)) {
            System.out.println(watchlist);
            watchlist.replace(chunk, true);
            System.out.println(watchlist);
        }

        if (blacklist.contains(chunk)) {
            //System.err.println("BLACKLISTED");
            return;
        }

        int timeoutDelay = Utils.random(0, 400);
        boolean exists = Database.hasChunk(chunk);

        StoredHandler storedHandler = new StoredHandler(peerID, chunk);
        mc.addHandler(storedHandler);
        try {
            Thread.sleep(timeoutDelay);
        } catch (InterruptedException e) { e.printStackTrace(); }

        Message stored = new Message(MessageType.STORED, peerID, m.fileID, m.chunkNo);
        if (exists) {
            Log.info("Chunk already stored ("+chunk+")");
            mc.send(stored);
        }
        else if (storedHandler.getCount() < chunk.replDeg) {
            Database.addChunk(chunk);
            Log.info("Stored chunk ("+chunk+") ("+
                    chunk.data.length+" bytes) ("+
                    Database.numChunks()+" chunks total)");
            mc.send(stored);
        }
        else {
            Log.info("No need to store chunk "+chunk+
                    " because the desired replication degree has been reached ("
                    +storedHandler.getCount()+")");
        }
        mc.removeHandler(storedHandler);
    }

    public void watch(Chunk c) {
        if (watchlist.containsKey(c))
            watchlist.replace(c, false);
        else watchlist.put(c, false);
    }

    public void ignore(Chunk c) {
        if (watchlist.containsKey(c)) watchlist.remove(c);
    }

    public boolean watching(Chunk c) {
        for (Chunk chunk : watchlist.keySet()) {
            if (c.equals(chunk)) return true;
        }
        return false;
    }

    public boolean received(Chunk c) {
        if (watchlist.containsKey(c))
            return watchlist.get(c);
        return false;
    }

    public void blacklist(Chunk c) {
        if (!blacklist.contains(c))
            blacklist.add(c);
    }
}
