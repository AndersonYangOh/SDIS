import java.net.Inet4Address;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.Collections;

public class Utils {
    public static String getIPv4() throws SocketException {

        return Collections.list(NetworkInterface.getNetworkInterfaces()).stream()
                .flatMap(i -> Collections.list(i.getInetAddresses()).stream())
                .filter(ip -> ip instanceof Inet4Address && ip.isSiteLocalAddress())
                .findFirst().orElseThrow(RuntimeException::new)
                .getHostAddress();
    }
}
