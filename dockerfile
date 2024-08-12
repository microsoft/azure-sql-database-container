FROM mcr.microsoft.com/arcdata/arc-sqlmi:v1.31.0_2024-07-09
COPY azuresqldb_license.txt /usr/share/doc/arc/SupplementalEULA-AzureArcDataServices.txt
ENTRYPOINT ["sh", "-c", "cat /usr/share/doc/arc/SupplementalEULA-AzureArcDataServices.txt && /opt/mssql/bin/sqlservr"]