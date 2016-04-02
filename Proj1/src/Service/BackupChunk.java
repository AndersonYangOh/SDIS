package Service;

import Listener.MCastSocketListener;
import Protocol.Chunk.Chunk;
import Protocol.Handler.StoredHandler;
import Protocol.Message.Message;
import Protocol.Message.MessageType;
import Utils.Log;
import Utils.Timeout;

public class BackupChunk {
    MCastSocketListener mc, mdb;
    Chunk c;
    int id;

    public BackupChunk(MCastSocketListener mc, MCastSocketListener mdb, Chunk c, int id) {
        this.mc = mc;
        this.mdb = mdb;
        this.c = c;
        this.id = id;
    }

    public void run() throws Exception{
        Message putchunk_msg = new Message(MessageType.PUTCHUNK, id, c.fileID, c.chunkNo, c.replDeg, c.data);
        StoredHandler storedHandler = new StoredHandler(id, c);
        mc.addHandler(storedHandler);
        mdb.send(putchunk_msg);

        int time_window = 1000;
        int attempt = 0;

        Thread t = new Thread(new Timeout(time_window));
        t.start();

        boolean success = false;
        while (true) {
            if (storedHandler.getCount() >= c.replDeg) {
                success = true;
                break;
            }
            if (!t.isAlive()) {
                ++attempt;
                if (attempt >= 5) {
                    break;
                }
                else {
                    mdb.send(putchunk_msg);
                    time_window*=2;
                    t = new Thread(new Timeout(time_window));
                    t.start();
                    Log.warning("Backup replication degree not reached, retrying...("+attempt+"x "+time_window+"ms)");
                }
            }
            try {
                Thread.sleep(1);
            } catch (InterruptedException e) { e.printStackTrace(); }
        }
        mc.removeHandler(storedHandler);
        if (!success) {
            Log.error("Maximum number of attempts reached, couldn't backup chunk");
            throw new Exception();
        }
        else Log.info("Successfully backed up chunk "+c);
    }
}
