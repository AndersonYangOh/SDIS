package Listener;

import Exception.MessageVersionMismatchException;
import Protocol.Handler.Handler;
import Protocol.Message.Message;
import Protocol.Protocol;
import Utils.Log;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.InetAddress;
import java.net.MulticastSocket;
import java.util.ArrayList;

public class MCastSocketListener implements Runnable{
    private MulticastSocket peerSocket;
    private MulticastSocket socket;
    private InetAddress group;
    private int port;
    private String name;
    public ArrayList<Handler> handlers = new ArrayList<>();

    public MCastSocketListener(InetAddress _group, int _port) {
        this(_group, _port, "");
    }

    public MCastSocketListener(InetAddress _group, int _port, String _name) {
        group = _group;
        port = _port;
        name = _name;
        open();
    }

    public void listen() {
        byte[] buffer = new byte[Protocol.MAX_CHUNK_SIZE + 512];
        boolean done = false;
        while (!done) {
            DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
            try {
                socket.receive(packet);
                handle(packet);
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    public void send(byte[] packet) {
            DatagramPacket p = new DatagramPacket(packet, packet.length, group, port);
            try {
                peerSocket.send(p);
                //socket.send(p);
            } catch (IOException e) {
                e.printStackTrace();
            }
    }

    public void send(Message message) {
        send(message.getBytes());
    }

    public void close() {
        if (socket != null){
            try { socket.leaveGroup(group); } catch (IOException e) { e.printStackTrace(); }
            socket.close();
        }
    }

    public void addHandler(Handler h) {
        h.channel = name;
        handlers.add(h);
    }
    public boolean removeHandler(Handler h) {
        for (int i = 0; i < handlers.size(); ++i) {
            if (handlers.get(i).equals(h)) {
                handlers.remove(i);
                return true;
            }
        }
        return false;
    }

    public void setPeerSocket(MulticastSocket socket) {
        this.peerSocket = socket;
    }

    @Override
    public void run() {
        listen();
    }

    private void open() {
        try {
            socket = new MulticastSocket(port);
            socket.setBroadcast(true);
            socket.setTimeToLive(5);
            socket.joinGroup(group);
        }
        catch (Exception e) {
            e.printStackTrace();
        }
    }


    private void handle(DatagramPacket packet) {
        try {
            Message m = new Message(packet);
            for (int i = 0; i < handlers.size(); ++i) {
                handlers.get(i).msg = m;
                new Thread(handlers.get(i)).start();
            }
        }
        catch (IllegalArgumentException e) {
            Log.warning("Received invalid message, discarding...");
        }
        catch (MessageVersionMismatchException e) {
            Log.warning("Received unsupported message version, discarding... ("+e.getMessage()+")");
        }
    }
}
