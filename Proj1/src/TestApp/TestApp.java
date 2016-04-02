package TestApp;

import java.io.DataOutputStream;
import java.net.ConnectException;
import java.net.InetAddress;
import java.net.Socket;
import java.util.Scanner;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TestApp {
    public static void main(String[] args) {
        if (args.length < 2) {
            usage();
            System.exit(-1);
        }
        String ip_regex = "(?:\\d{1,3}\\.){3}\\d{1,3}";

        Pattern p = Pattern.compile("(?:(?:(?<ip>"+ip_regex+"):)|(?::?))(?<port>\\d+)");
        Matcher m = p.matcher(args[0]);
        if (!m.matches()) {
            System.err.println("Bad address format " + args[0]);
            usage();
            System.exit(-1);
        }

        String ip = (m.group("ip") != null ? m.group("ip") : "127.0.0.1");
        int port = Integer.parseInt(m.group("port"));

        try {
            InetAddress addr = InetAddress.getByName(ip);

            Socket socket = new Socket(addr, port);
            DataOutputStream out = new DataOutputStream(socket.getOutputStream());

            String request = "";
            if (args[1].equals("BACKUP") && args.length == 4) {
                request = "BACKUP " + args[2] + " " + args[3];
            }
            else if (args[1].equals("RESTORE") && args.length == 3) {
                request = "RESTORE " + args[2];
            }
            else if (args[1].equals("DELETE") && args.length == 3) {
                request = "DELETE " + args[2];
            }
            else if (args[1].equals("RECLAIM") && args.length == 3) {
                request = "RECLAIM " + args[2];
            }
            else if (args[1].equals("CLEAR") && args.length == 3) {
                request = "CLEAR";
            }
            else if (args[1].equals("QUIT") && args.length == 2) {
                request = "QUIT";
            }
            else if (args[1].equals("INTERACTIVE") && args.length == 2) {
                Scanner in = new Scanner(System.in);
                request = in.nextLine();
            }
            else {
                usage();
                System.exit(-1);
            }

            System.out.println("Socket on "+ip+":"+port);
            System.out.println("Sending request: " + request);
            out.writeBytes(request);
            socket.close();
        } catch (ConnectException e) { System.err.println("Couldn't connect to peer on " + ip+":"+port);
        } catch (Exception e) { e.printStackTrace(); }
    }

    private static void usage() {
        String optFormat = "\t%-50s %-50s";
        System.out.println("Usage: ");
        System.out.println("\tTestApp <peer_ip_addr>:<peer_port> [options]");
        System.out.println("\tTestApp [:]<peer_port> [options]");
        System.out.println("");
        System.out.println("Options");
        System.out.println("--------------------");
        System.out.println(String.format(optFormat,"BACKUP <file_name> <replication_degree>", "Backup file with specified replication degree"));
        System.out.println(String.format(optFormat,"RESTORE <file_name>", "Restore file that was previously replicated"));
        System.out.println(String.format(optFormat,"DELETE <file_name>", "Delete file from backup service"));
        System.out.println(String.format(optFormat,"RECLAIM <num_chunks>", "Reclaim the space occupied by the number of chunks specified"));
        System.out.println(String.format(optFormat,"CLEAR", "Clear the peer's database"));
        System.out.println(String.format(optFormat,"INTERACTIVE", "Send commands using stdin"));
        System.out.println(String.format(optFormat,"QUIT", "Makes the peer quit"));
    }
}
