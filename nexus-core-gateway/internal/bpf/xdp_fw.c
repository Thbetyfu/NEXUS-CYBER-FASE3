// +build ignore

#include <linux/bpf.h>
#include <linux/in.h>
#include <linux/ip.h>
#include <linux/if_ether.h>
#include <bpf/bpf_helpers.h>

// Definisikan BPF Map bertipe Hash untuk menyimpan IP penyerang
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 10240);
    __type(key, __be32);   // IPv4 address
    __type(value, __u8);   // Dummy status value (1 = blocked)
} nexus_malicious_ips SEC(".maps");

SEC("xdp")
int xdp_filter(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data     = (void *)(long)ctx->data;

    // 1. Parsing Ethernet Header
    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end) {
        return XDP_PASS;
    }

    // Hanya evaluasi paket IPv4
    if (eth->h_proto != __constant_htons(ETH_P_IP)) {
        return XDP_PASS;
    }

    // 2. Parsing IP Header
    struct iphdr *ip = (void *)(eth + 1);
    if ((void *)(ip + 1) > data_end) {
        return XDP_PASS;
    }

    // 3. Pencocokan IP penyerang pada Map biner kernel
    __be32 src_ip = ip->saddr;
    __u8 *blocked = bpf_map_lookup_elem(&nexus_malicious_ips, &src_ip);
    if (blocked) {
        // Drop paket seketika di level driver/NIC (Zero CPU overhead di layer aplikasi)
        return XDP_DROP;
    }

    return XDP_PASS;
}

char _license[] SEC("license") = "GPL";
