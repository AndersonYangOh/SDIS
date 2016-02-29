import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;

public class Client {
    private static String hostname;
    private static int port;
    private static Request request;
    public static void main(String[] args) {
        if (args.length < 3) {
            System.out.println("Usage:");
            System.out.println("\tClient <hostname> <port> <oper> <opnd>*");
            return;
        }
        hostname = args[0];
        port = Integer.parseInt(args[1]);
        String reqString = args[2].toUpperCase();
        for (int i = 3; i < args.length; ++i) {
            reqString = reqString.concat(" " + args[i]);
        }
        request = new Request(reqString);

        System.out.println("+----------- CLIENT -------------");
        System.out.println("| Host: " + hostname + ":" + port);
        System.out.println("| Request: " + request.toString());
        System.out.println("+--------------------------------");

        try {
            System.out.println("Opening socket...");
            DatagramSocket socket = new DatagramSocket();

            byte[] buf = request.toString().getBytes();
            InetAddress address = InetAddress.getByName(hostname);

            System.out.println("Sending to: " + address + ":" + port);
            System.out.println("\t- " + "'" + request.toString() + "'");
            DatagramPacket packet = new DatagramPacket(buf, buf.length, address, port);
            socket.send(packet);

            System.out.println("Waiting for response...");
            packet = new DatagramPacket(buf, buf.length);
            socket.receive(packet);
            String response = new String(packet.getData(), 0, packet.getLength());
            System.out.println("Received response: " + response);

            System.out.println("Closing socket...");
            socket.close();
        }
        catch (Exception e) {
            e.printStackTrace();
        }
    }
}
