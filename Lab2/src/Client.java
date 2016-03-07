import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.MulticastSocket;

public class Client {
    private static String srvcAddr;
    private static int srvcPort;
    private static String mcastAddr;
    private static int mcastPort;

    private static Request request;
    public static void main(String[] args) {
        if (args.length < 3) {
            System.out.println("Usage:");
            System.out.println("\tClient <mcast_addr> <mcast_port> <oper> <opnd>*");
            return;
        }
        mcastAddr = args[0];
        mcastPort = Integer.parseInt(args[1]);
        String reqString = args[2].toUpperCase();
        for (int i = 3; i < args.length; ++i) {
            reqString = reqString.concat(" " + args[i]);
        }
        request = new Request(reqString);



        try {
            InetAddress group = InetAddress.getByName(mcastAddr);
            MulticastSocket mcastSocket = new MulticastSocket(mcastPort);
            mcastSocket.joinGroup(group);

            System.out.println("+----------- CLIENT -------------");
            System.out.println("| Group: " + group + ":" + mcastPort);
            System.out.println("| Request: " + request.toString());
            System.out.println("+--------------------------------");

            byte[] buf = new byte[512];
            DatagramPacket mcastPacket = new DatagramPacket(buf, buf.length);
            mcastSocket.receive(mcastPacket);

            String[] mcastMsg = new String(mcastPacket.getData(), 0, mcastPacket.getLength()).split(":");
            srvcAddr = mcastMsg[0];
            srvcPort = Integer.parseInt(mcastMsg[1]);

            System.out.println("multicast: " + mcastAddr + " " + mcastPort +
            ": " + srvcAddr + " " + srvcPort);

            // Lab1
            DatagramSocket socket = new DatagramSocket();

            buf = request.toString().getBytes();
            InetAddress address = InetAddress.getByName(srvcAddr);

            DatagramPacket packet = new DatagramPacket(buf, buf.length, address, srvcPort);
            socket.send(packet);

            System.out.print(request.toString() + " :: ");
            packet = new DatagramPacket(buf, buf.length);
            socket.receive(packet);
            String response = new String(packet.getData(), 0, packet.getLength());

            System.out.println(response);

            socket.close();

            // End Lab1

            mcastSocket.leaveGroup(group);
            mcastSocket.close();
        }
        catch (Exception e) {
            e.printStackTrace();
        }
    }
}
