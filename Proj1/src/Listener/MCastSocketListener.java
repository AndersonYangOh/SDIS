package Listener;

import java.net.InetAddress;
import java.net.MulticastSocket;

public class MCastSocketListener {
    private MulticastSocket socket;
    private InetAddress address;
    private int port;

    public MCastSocketListener(InetAddress _address, int _port) {
        address = _address;
        port = _port;
    }

    public void open() {
        try {
            socket = new MulticastSocket(port);
            socket.setTimeToLive(1);
            socket.joinGroup(address);
        }
        catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void close() {
        if (socket != null) socket.close();
    }
}
