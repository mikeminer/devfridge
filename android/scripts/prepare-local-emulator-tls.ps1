$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$client = [Net.Sockets.TcpClient]::new('world.devfridge.cool', 443)
try {
    # Use normal Windows TLS validation. Never accept an untrusted certificate.
    $tls = [Net.Security.SslStream]::new($client.GetStream(), $false)
    try {
        $tls.AuthenticateAsClient('world.devfridge.cool')
        $leaf = [Security.Cryptography.X509Certificates.X509Certificate2]::new($tls.RemoteCertificate)
        $chain = [Security.Cryptography.X509Certificates.X509Chain]::new()
        try {
            # The live TLS handshake above has already validated hostname and trust.
            # Match AuthenticateAsClient(string)'s default while extracting its local
            # scanning root, which does not publish a certificate revocation service.
            $chain.ChainPolicy.RevocationMode = [Security.Cryptography.X509Certificates.X509RevocationMode]::NoCheck
            if (!$chain.Build($leaf)) { throw 'Windows could not validate the HTTPS certificate chain.' }
            $rootCertificate = $chain.ChainElements[$chain.ChainElements.Count - 1].Certificate
            if ($rootCertificate.Subject -notlike '*CN=Avast Web/Mail Shield Root*') {
                throw 'This helper only applies to the Avast certificate interception observed on this PC.'
            }
            $trustedRoot = @(Get-ChildItem Cert:\LocalMachine\Root, Cert:\CurrentUser\Root |
                Where-Object Thumbprint -eq $rootCertificate.Thumbprint)
            if (!$trustedRoot.Count) { throw 'The certificate is not in a Windows trusted root store.' }
            $output = Join-Path $projectRoot 'tools\emulator-debug-res'
            New-Item -ItemType Directory -Force -Path (Join-Path $output 'raw'), (Join-Path $output 'xml') | Out-Null
            # Export only the public CA certificate; no private key is read or exported.
            [IO.File]::WriteAllBytes((Join-Path $output 'raw\local_emulator_ca.cer'), $rootCertificate.RawData)
            $config = [xml](Get-Content (Join-Path $projectRoot 'app\src\main\res\xml\network_security_config.xml') -Raw)
            $domain = $config.CreateElement('domain-config')
            $domain.SetAttribute('cleartextTrafficPermitted', 'false')
            $hostNode = $config.CreateElement('domain')
            $hostNode.SetAttribute('includeSubdomains', 'false')
            $hostNode.InnerText = 'world.devfridge.cool'
            $null = $domain.AppendChild($hostNode)
            $anchors = $config.CreateElement('trust-anchors')
            foreach ($source in @('system', '@raw/local_emulator_ca')) {
                $certNode = $config.CreateElement('certificates')
                $certNode.SetAttribute('src', $source)
                $certNode.SetAttribute('overridePins', 'false')
                $null = $anchors.AppendChild($certNode)
            }
            $null = $domain.AppendChild($anchors)
            $null = $config.DocumentElement.AppendChild($domain)
            $config.Save((Join-Path $output 'xml\network_security_config.xml'))
            "Public test CA exported: $($rootCertificate.Thumbprint). Scope: world.devfridge.cool only."
            'Build with -PlocalEmulatorTls=true to opt in for debug only. Default debug and release builds exclude these resources.'
        } finally { $chain.Dispose() }
    } finally { $tls.Dispose() }
} finally { $client.Dispose() }
