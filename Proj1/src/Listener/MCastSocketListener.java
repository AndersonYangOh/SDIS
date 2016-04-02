package Listener;

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
    private MulticastSocket socket;
    private InetAddress address;
    private int port;
    private String name;
    public ArrayList<Handler> handlers = new ArrayList<>();

    public MCastSocketListener(InetAddress _address, int _port) {
        this(_address, _port, "");
    }

    public MCastSocketListener(InetAddress _address, int _port, String _name) {
        address = _address;
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
        if (socket != null){
            DatagramPacket p = new DatagramPacket(packet, packet.length, address, port);
            try {
                socket.send(p);
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    public void send(Message message) {
        send(message.getBytes());
    }

    public void close() { if (socket != null) socket.close(); }

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

    @Override
    public void run() {
        listen();
    }

    private void open() {
        try {
            socket = new MulticastSocket(port);
            socket.setTimeToLive(1);
            socket.joinGroup(address);
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
    }
}
