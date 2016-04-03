package Service;

import Listener.MCastSocketListener;
import Protocol.Chunk.Chunk;
import Protocol.Chunk.ChunkMaker;
import Protocol.Handler.*;
import Protocol.Message.Message;
import Protocol.Message.MessageType;
import Protocol.Protocol;
import Utils.Log;
import Utils.Timeout;
import Utils.Utils;

import java.io.*;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.ArrayList;

public class Peer {
    private int id;
    private ServerSocket srvSocket;
    private MCastSocketListener mc, mdb, mdr;
    private BackupHandler backupHandler;
    private FileSystem fileSystem;

    public Peer(int _id, InetAddress mcAddr, int mcPort, InetAddress mdbAddr, int mdbPort, InetAddress mdrAddr, int mdrPort) {
        id = _id;
        mc = new MCastSocketListener(mcAddr, mcPort, "MC ");
        mdb = new MCastSocketListener(mdbAddr, mdbPort, "MDB");
        mdr = new MCastSocketListener(mdrAddr, mdrPort, "MDR");

        int port = Protocol.BASE_TCP_PORT+id;
        try {
            srvSocket = new ServerSocket(port);
        } catch (Exception e) { e.printStackTrace(); }

        Thread mcThread = new Thread(mc);
        Thread mdbThread = new Thread(mdb);
        Thread mdrThread = new Thread(mdr);
        mcThread.start();
        mdbThread.start();
        mdrThread.start();


        backupHandler = new BackupHandler(id, mc);
        mdb.addHandler(backupHandler);

        ReplDegHandler replDegHandler = new ReplDegHandler(id);
        mc.addHandler(replDegHandler);

        DeleteHandler deleteHandler = new DeleteHandler();
        mc.addHandler(deleteHandler);

        RestoreHandler restoreHandler = new RestoreHandler(id, mdr);
        mc.addHandler(restoreHandler);

        RemovedHandler removedHandler = new RemovedHandler(id, backupHandler, mc, mdb);
        mc.addHandler(removedHandler);

        fileSystem = new FileSystem(id);
        Database.loadDatabase();

        Log.info("Initialized peer with ID " + id);
        Log.info("Socket open on port "+ srvSocket.getLocalPort());

        run();
    }

    void run() {
        boolean done = false;
        while (!done) {
            Socket s = null;
            try {
                s = srvSocket.accept();
            } catch (Exception e) { e.printStackTrace(); }

            try {
                BufferedReader br = new BufferedReader(new InputStreamReader(s.getInputStream()));
                String request = br.readLine();
                Log.info("Received request: " + request);
                String[] tokens = request.split(" ");
                if (tokens[0].equals("BACKUP")) {
                    int replDeg = Integer.parseInt(tokens[2]);
                    try {
                        File f = new File(tokens[1]);
                        backup(f, replDeg);
                    } catch (Exception e) { e.printStackTrace(); }
                }
                else if (tokens[0].equals("RESTORE")) {
                    try {
                        File f = new File(tokens[1]);
                        restore(f);
                    } catch (Exception e) { e.printStackTrace(); }
                }
                else if (tokens[0].equals("DELETE")) {
                    try {
                        File f = new File(tokens[1]);
                        delete(f);
                    } catch (Exception e) { e.printStackTrace(); }
                }
                else if (tokens[0].equals("RECLAIM")) {
                    try {
                        int numChunks = Integer.parseInt(tokens[1]);
                        reclaim(numChunks);
                    } catch (Exception e) { e.printStackTrace(); }
                }
                else if (tokens[0].equals("CLEAR")) {
                    Database.clear();
                }
                else if (tokens[0].equals("QUIT")) {
                    s.close();
                    done = true;
                }
            } catch (Exception e) { e.printStackTrace(); }
        }
        Log.info("Closing peer with ID " + id);
        mc.close();
        mdr.close();
        mdb.close();
        try { srvSocket.close(); } catch (IOException e) { e.printStackTrace(); }
        System.exit(0);
    }

    private void backup(File file, int repl) { new Thread(new BackupFile(file, repl)).start(); }
    private void restore(File file) { new Thread(new RestoreFile(file)).start(); }
    private void delete(File file) { new Thread(new DeleteFile(file)).start(); }
    private void reclaim(int numChunks) { new Thread(new ReclaimSpace(numChunks)).start(); }

    public static void main(String[] args) throws Exception{
        InetAddress mcAddr, mdbAddr, mdrAddr;
        int mcPort, mdbPort, mdrPort;
        int peer_id;

        if (args.length == 1 || args.length == 7) {
            peer_id = Integer.parseInt(args[0]);
            if (args.length == 1) {
                mcAddr = InetAddress.getByName("224.0.0.0");
                mdbAddr = mdrAddr = mcAddr;
                mcPort = 8000; mdbPort = 8001; mdrPort = 8002;

            }
            else {
                mcAddr = InetAddress.getByName(args[1]);
                mdbAddr = InetAddress.getByName(args[3]);
                mdrAddr = InetAddress.getByName(args[5]);
                mcPort = Integer.parseInt(args[2]);
                mdbPort = Integer.parseInt(args[4]);
                mdrPort = Integer.parseInt(args[6]);
            }

            Peer p = new Peer(peer_id, mcAddr, mcPort, mdbAddr, mdbPort, mdrAddr, mdrPort);
        }
        else {
            System.out.println("Usage:");
            System.out.println("\tjava Service.Peer <server_id>");
            System.out.println("\tjava Service.Peer <server_id> <mc_addr> <mc_port> <mdb_addr> <mdb_port> <mdr_addr> <mdr_port>");
        }
    }

    private class BackupFile implements Runnable {
        File file;
        int repl;

        public BackupFile(File _file, int _repl) { file = _file; repl = _repl; }

        @Override
        public void run() {
            try {
                ChunkMaker cm = new ChunkMaker(file, repl);
                Chunk[] chunks = cm.getChunks();
                for (Chunk c : chunks) {
                    new BackupChunk(mc, mdb, c, id).run();
                }
                Log.info("Successfully backed up "+
                        file.getName()+
                        " into "+chunks.length+
                        " chunks with replication degree of " + repl);
            } catch (Exception e) {
                Log.error("Failed to backup "+
                        file.getName()+
                        " with replication degree of " + repl);
                e.printStackTrace();
                Log.warning("Cleaning up for backup failure...");
                new Thread(new DeleteFile(file)).start();
            }
        }
    }

    private class RestoreFile implements Runnable {
        File file;
        public RestoreFile(File _file) { file = _file; }

        @Override
        public void run() {
            try {
                String fileID = Utils.getFileID(file);
                ArrayList<Chunk> chunks = new ArrayList<>();

                int currChunk = 0;
                boolean lastChunk = false;
                while (!lastChunk) {
                    Message getchunk_msg = new Message(MessageType.GETCHUNK, id, fileID, currChunk);
                    Chunk chunk = new Chunk(fileID, currChunk);

                    ChunkHandler chunkHandler = new ChunkHandler(chunk);
                    chunkHandler.storeOnReceive(true);
                    mdr.addHandler(chunkHandler);

                    int time_window = 1000;
                    int attempt = 0;

                    mc.send(getchunk_msg);
                    Thread t = new Thread(new Timeout(time_window));
                    t.start();

                    boolean success = false;
                    while (true) {
                        if (chunkHandler.received()) {
                            success = true;
                            break;
                        }
                        if (!t.isAlive()) {
                            ++attempt;
                            if (attempt >= 5) {
                                break;
                            }
                            else {
                                mc.send(getchunk_msg);
                                time_window *= 2;
                                t = new Thread(new Timeout(time_window));
                                t.start();
                                Log.warning("Couldn't get chunk, retrying...("+attempt+"x "+time_window+"ms)");
                            }
                        }
                        try {
                            Thread.sleep(1);
                        } catch (InterruptedException e) { e.printStackTrace(); }
                    }
                    mdr.removeHandler(chunkHandler);
                    if (!success) {
                        Log.error("Maximum number of attempts reached, couldn't get chunk");
                        throw new Exception();
                    }
                    Chunk recoverChunk = chunkHandler.getStored();
                    if (!chunks.contains(recoverChunk)) chunks.add(recoverChunk);
                    Log.info("Got chunk ("+recoverChunk+") ("+recoverChunk.getDataSize()+" bytes)");
                    if (recoverChunk.getDataSize() < Protocol.MAX_CHUNK_SIZE) lastChunk = true;
                    ++currChunk;
                }
                Log.info("Recovered "+chunks.size()+" chunks of file "+file.getName());
                try (FileOutputStream fos = new FileOutputStream(FileSystem.getRestoredPathName(file.getName()))) {
                    for (Chunk c : chunks)
                        fos.write(c.data);
                }
            }
            catch (Exception e) {
                Log.error("Failed to restore "+ file.getName());
                e.printStackTrace();
            }
        }
    }

    private class DeleteFile implements Runnable {
        File file;
        public DeleteFile(File _file) { file = _file; }

        @Override
        public void run() {
            String fileID = Utils.getFileID(file);
            Message deleteMsg = new Message(MessageType.DELETE, id, fileID);
            mc.send(deleteMsg);
        }
    }

    private class ReclaimSpace implements Runnable {
        int numChunks;
        public ReclaimSpace(int _numChunks) { numChunks = _numChunks;}

        @Override
        public void run() {
            for (int i = 0; i < numChunks; ++i) {
                if (Database.numChunks() == 0) break;

                ArrayList<Chunk> chunks = Database.getChunks();
                Chunk chunk_to_remove = null;
                for (Chunk c : chunks) {
                    if (c.getRealReplDeg() > c.replDeg) {
                        chunk_to_remove = c;
                        break;
                    }
                }
                if (chunk_to_remove == null) chunk_to_remove = chunks.get(Utils.random(0, chunks.size()-1));

                Log.info("Removing chunk ("+chunk_to_remove+") ("+chunk_to_remove.getDataSize()+" bytes)");

                // TODO: Remove from blacklist once backup is done (e.g. when STORED is received)
                backupHandler.blacklist(chunk_to_remove);

                Message removed_msg = new Message(MessageType.REMOVED, id, chunk_to_remove.fileID, chunk_to_remove.chunkNo);
                mc.send(removed_msg);

                // UGLY FIX: For some reason you can't send packets too fast or it will just send the last package
                // multiple times
                try {
                    Thread.sleep(10);
                } catch (InterruptedException e) { e.printStackTrace(); }

                Database.removeChunk(chunk_to_remove);
            }
            Log.info("Stored chunks after reclaim: "+ Database.numChunks());
        }
    }
}
