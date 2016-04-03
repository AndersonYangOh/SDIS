package Protocol.Handler;

import Listener.MCastSocketListener;
import Protocol.Chunk.Chunk;
import Protocol.Message.Message;
import Protocol.Message.MessageType;
import Service.BackupChunk;
import Service.Database;
import Utils.Log;
import Utils.Timeout;
import Utils.Utils;

public class RemovedHandler extends Handler{

    private BackupHandler backupHandler;
    private MCastSocketListener mc,mdb;

    public RemovedHandler(int _peerID, BackupHandler _backupHandler, MCastSocketListener _mc, MCastSocketListener _mdb) {
        super(_peerID);
        backupHandler = _backupHandler;
        mc = _mc;
        mdb = _mdb;
    }

    @Override
    public void handle(Message m) {
        if (m.type != MessageType.REMOVED)
            return;
        if (m.senderID == peerID) return;

        Chunk c = new Chunk(m);

        try {
            Chunk stored_chunk = Database.getChunk(c);
            stored_chunk.removed(m.senderID);

            if (stored_chunk.getRealReplDeg() < stored_chunk.replDeg) {
                Log.warning("Replication degree for chunk ("+stored_chunk+") is below desired ("+
                        stored_chunk.getRealReplDeg()+"<"+stored_chunk.replDeg+")");
                backupHandler.watch(stored_chunk);
                int timeoutDelay = Utils.random(0, 400);
                Thread t = new Thread(new Timeout(timeoutDelay));
                t.start();
                while (true) {
                    if (backupHandler.received(stored_chunk))
                        break;
                    if (!t.isAlive()) {
                        new BackupChunk(mc, mdb, stored_chunk, peerID).run();
                        break;
                    }
                }
                backupHandler.ignore(stored_chunk);
            }
        }
        catch (IllegalArgumentException e) {
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
