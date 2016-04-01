package Service;

import Listener.MCastSocketListener;

import Protocol.Chunk.Chunk;
import Protocol.Chunk.ChunkMaker;
import Protocol.Handler.BackupHandler;
import Protocol.Handler.LogHandler;
import Protocol.Handler.ReplDegHandler;
import Protocol.Handler.StoredHandler;
import Protocol.Message.Message;
import Protocol.Message.MessageType;
import Utils.Log;
import Utils.Utils;
import Utils.Timeout;
import Protocol.Protocol;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;

public class Peer {
    private int id;
    private ServerSocket socket;
    private MCastSocketListener mc, mdb, mdr;

    public Peer(int _id, InetAddress mcAddr, int mcPort, InetAddress mdbAddr, int mdbPort, InetAddress mdrAddr, int mdrPort) {
        id = _id;
        mc = new MCastSocketListener(mcAddr, mcPort, "MC ");
        mdb = new MCastSocketListener(mdbAddr, mdbPort, "MDB");
        mdr = new MCastSocketListener(mdrAddr, mdrPort, "MDR");

        int port = Protocol.BASE_TCP_PORT+id;
        try {
            socket = new ServerSocket(port);
        } catch (Exception e) { e.printStackTrace(); }

        Thread mcThread = new Thread(mc);
        Thread mdbThread = new Thread(mdb);
        Thread mdrThread = new Thread(mdr);
        mcThread.start();
        mdbThread.start();
        mdrThread.start();

/*      mc.addHandler(new LogHandler());
        mdb.addHandler(new LogHandler());
        mdr.addHandler(new LogHandler());*/

        BackupHandler backupHandler = new BackupHandler(id, mc);
        mdb.addHandler(backupHandler);

        ReplDegHandler replDegHandler = new ReplDegHandler(id);
        mc.addHandler(replDegHandler);

        Log.info("Initialized peer with ID " + id);
        Log.info("Socket open on port "+socket.getLocalPort());

        run();
    }

    void run() {
        boolean done = false;
        while (!done) {
            Socket s = null;
            try {
                s = socket.accept();
            } catch (Exception e) { e.printStackTrace(); }

            try {
                BufferedReader br = new BufferedReader(new InputStreamReader(s.getInputStream()));
                String request = br.readLine();
                Log.info("Received request: " + request);
                String[] tokens = request.split(" ");
                if (tokens[0].equals("BACKUP")) {
                    String filename = tokens[1];
                    int replDeg = Integer.parseInt(tokens[2]);
                    try {
                        File f = new File(filename);
                        backup(f, replDeg);
                    } catch (Exception e) { e.printStackTrace(); }
                }
                else if (tokens[0].equals("RESTORE")) {
                    restore(tokens[1]);
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
        try { socket.close(); } catch (IOException e) { e.printStackTrace(); }
        System.exit(0);
    }

    void backup(File file, int repl) {
        new Thread(new BackupFile(file, repl)).start();
    }

    void restore(String filename) {
        new Thread(new RestoreFile(filename)).start();
    }


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
            System.out.println("\tService <server_id>");
            System.out.println("\tService <server_id> <mc_addr> <mc_port> <mdb_addr> <mdb_port> <mdr_addr> <mdr_port>");
        }
    }

    private class BackupFile implements Runnable {
        File file;
        int repl;

        public BackupFile(File _file, int _repl) { file = _file; repl = _repl; }

        @Override
        public void run() {
            String fileID = Utils.getFileID(file);
            try {
                ChunkMaker cm = new ChunkMaker(file, fileID, repl);
                Chunk[] chunks = cm.getChunks();
                for (Chunk c : chunks) {
                    Message putchunk_msg = new Message(MessageType.PUTCHUNK, "1.0", id, c.fileID, c.chunkNo, c.replDeg, c.data);
                    StoredHandler storedHandler = new StoredHandler(id, c);
                    mc.addHandler(storedHandler);

                    int time_window = 1000;
                    int attempt = 0;

                    mdb.send(putchunk_msg.toString());
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
                                mdb.send(putchunk_msg.toString());
                                time_window*=2;
                                t = new Thread(new Timeout(time_window));
                                t.start();
                                Log.warning("Backup replication degree not reached, retrying...("+attempt+"x "+time_window+"ms)");
                            }
                        }
                    }
                    mc.removeHandler(storedHandler);
                    if (!success) {
                        Log.error("Maximum number of attempts reached, couldn't backup chunk");
                        throw new Exception();
                    }
                    else Log.info("Successfully backed up chunk "+c);
                }
                Log.info("Sucessfully backed up "+
                        file.getName()+
                        " into "+chunks.length+
                        " chunks with replication degree of " + repl);
            } catch (Exception e) {
                Log.error("Failed to backup "+
                        file.getName()+
                        " with replication degree of " + repl);
                e.printStackTrace();
            }
        }
    }

    private class RestoreFile implements Runnable {
        String filename;
        public RestoreFile(String _filename) { filename = _filename; }

        @Override
        public void run() {
        }
    }
}
