// GENERATED FILE — do not hand-edit. Produced by scripts/build-instance-size-data.mjs
// from the vendor datasets in `Cluster/VM Data/` (AWS/Azure/GCP instance sizes by
// class). Re-run that script after updating the vendor JSONs.

export const INSTANCE_SIZES = {
  "aws": {
    "T": [
      {
        "name": "t3.micro",
        "vcpus": 2,
        "ramGib": 1,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "t3.small",
        "vcpus": 2,
        "ramGib": 2,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "t3.medium",
        "vcpus": 2,
        "ramGib": 4,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "t3.large",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "t3.xlarge",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "t3.2xlarge",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "trn1.2xlarge",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      },
      {
        "name": "trn1.32xlarge",
        "vcpus": 128,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      }
    ],
    "M": [
      {
        "name": "m9g.medium",
        "vcpus": 1,
        "ramGib": 4,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      },
      {
        "name": "m9gd.medium",
        "vcpus": 1,
        "ramGib": 4,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      },
      {
        "name": "m5.large",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m6i.large",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m9g.large",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m9gd.large",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m5.xlarge",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m6i.xlarge",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m9g.xlarge",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m9gd.xlarge",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m5.2xlarge",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m6i.2xlarge",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m9g.2xlarge",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m9gd.2xlarge",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m5.4xlarge",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m6i.4xlarge",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m9g.4xlarge",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m9gd.4xlarge",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m5.8xlarge",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m6i.8xlarge",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m9g.8xlarge",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m9gd.8xlarge",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m5.16xlarge",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m6i.16xlarge",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      }
    ],
    "A": [
      {
        "name": "m6g.medium",
        "vcpus": 1,
        "ramGib": 4,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m6g.large",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m6g.xlarge",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m6g.2xlarge",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m6g.4xlarge",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "m6g.8xlarge",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      }
    ],
    "C": [
      {
        "name": "c9g.medium",
        "vcpus": 1,
        "ramGib": 2,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      },
      {
        "name": "c9gd.medium",
        "vcpus": 1,
        "ramGib": 2,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      },
      {
        "name": "c5.large",
        "vcpus": 2,
        "ramGib": 4,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c6i.large",
        "vcpus": 2,
        "ramGib": 4,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c9g.large",
        "vcpus": 2,
        "ramGib": 4,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c9gd.large",
        "vcpus": 2,
        "ramGib": 4,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c5.xlarge",
        "vcpus": 4,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c6i.xlarge",
        "vcpus": 4,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c9g.xlarge",
        "vcpus": 4,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c9gd.xlarge",
        "vcpus": 4,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c5.2xlarge",
        "vcpus": 8,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c6i.2xlarge",
        "vcpus": 8,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c9g.2xlarge",
        "vcpus": 8,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c9gd.2xlarge",
        "vcpus": 8,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c5.4xlarge",
        "vcpus": 16,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c6i.4xlarge",
        "vcpus": 16,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c9g.4xlarge",
        "vcpus": 16,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c9gd.4xlarge",
        "vcpus": 16,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c6i.8xlarge",
        "vcpus": 32,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c9g.8xlarge",
        "vcpus": 32,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c9gd.8xlarge",
        "vcpus": 32,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c5.9xlarge",
        "vcpus": 36,
        "ramGib": 72,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c6i.16xlarge",
        "vcpus": 64,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "c5.24xlarge",
        "vcpus": 96,
        "ramGib": 192,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      }
    ],
    "R": [
      {
        "name": "r9g.medium",
        "vcpus": 1,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      },
      {
        "name": "r9gd.medium",
        "vcpus": 1,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      },
      {
        "name": "r5.large",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r6i.large",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r9g.large",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r9gd.large",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r5.xlarge",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r6i.xlarge",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r9g.xlarge",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r9gd.xlarge",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r5.2xlarge",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r6i.2xlarge",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r9g.2xlarge",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r9gd.2xlarge",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r5.4xlarge",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r6i.4xlarge",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r9g.4xlarge",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r9gd.4xlarge",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r5.8xlarge",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r6i.8xlarge",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r9g.8xlarge",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r9gd.8xlarge",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r5.16xlarge",
        "vcpus": 64,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "r6i.16xlarge",
        "vcpus": 64,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      }
    ],
    "X": [
      {
        "name": "x2gd.medium",
        "vcpus": 1,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "x2gd.large",
        "vcpus": 2,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "x2gd.xlarge",
        "vcpus": 4,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "x2gd.2xlarge",
        "vcpus": 8,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "x2gd.4xlarge",
        "vcpus": 16,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      }
    ],
    "I": [
      {
        "name": "i4i.large",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "inf2.xlarge",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "i4i.xlarge",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "i4i.2xlarge",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "i4i.4xlarge",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "inf2.8xlarge",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "i4i.8xlarge",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "inf2.24xlarge",
        "vcpus": 96,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "inf2.48xlarge",
        "vcpus": 192,
        "ramGib": 768,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      }
    ],
    "D": [
      {
        "name": "d3.xlarge",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "d3.2xlarge",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "d3.4xlarge",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "d3.8xlarge",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "dl1.24xlarge",
        "vcpus": 96,
        "ramGib": 768,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      }
    ],
    "G": [
      {
        "name": "g5.xlarge",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "g5.2xlarge",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "g7.2xlarge",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "g7e.2xlarge",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "g5.4xlarge",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "g7.4xlarge",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "g7e.4xlarge",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "g5.8xlarge",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "g7.8xlarge",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "g7e.8xlarge",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "g5.12xlarge",
        "vcpus": 48,
        "ramGib": 192,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "g7.12xlarge",
        "vcpus": 48,
        "ramGib": 192,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "g7e.12xlarge",
        "vcpus": 48,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "g7.24xlarge",
        "vcpus": 96,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "g7e.24xlarge",
        "vcpus": 96,
        "ramGib": 1024,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "g7.48xlarge",
        "vcpus": 192,
        "ramGib": 768,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "g7e.48xlarge",
        "vcpus": 192,
        "ramGib": 2048,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      }
    ],
    "P": [
      {
        "name": "p5.4xlarge",
        "vcpus": 16,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "p4d.24xlarge",
        "vcpus": 96,
        "ramGib": 1152,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "p5.48xlarge",
        "vcpus": 192,
        "ramGib": 2048,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      },
      {
        "name": "p6-b200.48xlarge",
        "vcpus": 192,
        "ramGib": 2048,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      },
      {
        "name": "p6-b300.48xlarge",
        "vcpus": 192,
        "ramGib": 4096,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AWS Nitro Enclaves"
        }
      }
    ],
    "H": [
      {
        "name": "hpc7g.4xlarge",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      },
      {
        "name": "hpc7a.12xlarge",
        "vcpus": 24,
        "ramGib": 768,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      },
      {
        "name": "hpc7g.8xlarge",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      },
      {
        "name": "hpc7a.24xlarge",
        "vcpus": 48,
        "ramGib": 768,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      },
      {
        "name": "hpc7g.16xlarge",
        "vcpus": 64,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      },
      {
        "name": "hpc6a.48xlarge",
        "vcpus": 96,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      },
      {
        "name": "hpc7a.48xlarge",
        "vcpus": 96,
        "ramGib": 768,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      },
      {
        "name": "hpc7a.96xlarge",
        "vcpus": 192,
        "ramGib": 768,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      }
    ],
    "V": [
      {
        "name": "vt1.3xlarge",
        "vcpus": 12,
        "ramGib": 24,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      },
      {
        "name": "vt1.6xlarge",
        "vcpus": 24,
        "ramGib": 48,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      },
      {
        "name": "vt1.24xlarge",
        "vcpus": 96,
        "ramGib": 192,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": false,
          "technology": null
        }
      }
    ]
  },
  "azure": {
    "A": [
      {
        "name": "Standard_A1_v2",
        "vcpus": 1,
        "ramGib": 2,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_A2_v2",
        "vcpus": 2,
        "ramGib": 4,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_A2m_v2",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_A4_v2",
        "vcpus": 4,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_A4m_v2",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_A8_v2",
        "vcpus": 8,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_A8m_v2",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ],
    "B": [
      {
        "name": "Standard_B1s",
        "vcpus": 1,
        "ramGib": 1,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_B1ms",
        "vcpus": 1,
        "ramGib": 2,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_B2s",
        "vcpus": 2,
        "ramGib": 4,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_B2ms",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_B2s_v2",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_B4ms",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_B4s_v2",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_B8ms",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_B8s_v2",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_B16ms",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_B16s_v2",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_B20ms",
        "vcpus": 20,
        "ramGib": 80,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_B32s_v2",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ],
    "D": [
      {
        "name": "Standard_D2_v5",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D2ads_v7",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D2as_v5",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D2as_v7",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D2ds_v7",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D2s_v7",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D4_v5",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D4as_v5",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D8_v5",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D8ads_v7",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D8as_v5",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D8as_v7",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D8ds_v7",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D8s_v7",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D16_v5",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D16ads_v7",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D16as_v5",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D16as_v7",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D16ds_v7",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D16s_v7",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D32_v5",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D32ads_v7",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D32as_v5",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D32as_v7",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D32ds_v7",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D32s_v7",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D64_v5",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D64ads_v7",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D64as_v5",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D64as_v7",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D64ds_v7",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D64s_v7",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D128ads_v7",
        "vcpus": 128,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D128as_v7",
        "vcpus": 128,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D128ds_v7",
        "vcpus": 128,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D128s_v7",
        "vcpus": 128,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D160ads_v7",
        "vcpus": 160,
        "ramGib": 640,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D160as_v7",
        "vcpus": 160,
        "ramGib": 640,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D192ds_v7",
        "vcpus": 192,
        "ramGib": 768,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D192s_v7",
        "vcpus": 192,
        "ramGib": 768,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D372ds_v7",
        "vcpus": 372,
        "ramGib": 1488,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_D372s_v7",
        "vcpus": 372,
        "ramGib": 1488,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ],
    "Dc": [
      {
        "name": "Standard_DC1ds_v3",
        "vcpus": 1,
        "ramGib": 8,
        "sgxEnabled": true,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel SGX"
        }
      },
      {
        "name": "Standard_DC1s_v3",
        "vcpus": 1,
        "ramGib": 8,
        "sgxEnabled": true,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel SGX"
        }
      },
      {
        "name": "Standard_DC2ads_v5",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC2ads_v6",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC2as_v5",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC2as_v6",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC2eds_v6",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "Standard_DC2es_v6",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "Standard_DC2ds_v3",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": true,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel SGX"
        }
      },
      {
        "name": "Standard_DC2s_v3",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": true,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel SGX"
        }
      },
      {
        "name": "Standard_DC4ads_cc_v5",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC4ads_v5",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC4ads_v6",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC4as_cc_v5",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC4as_v5",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC4as_v6",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC4eds_v6",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "Standard_DC4es_v6",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "Standard_DC4ds_v3",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": true,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel SGX"
        }
      },
      {
        "name": "Standard_DC4s_v3",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": true,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel SGX"
        }
      },
      {
        "name": "Standard_DC8ads_cc_v5",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC8ads_v5",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC8ads_v6",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC8as_cc_v5",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC8as_v5",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC8as_v6",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC8eds_v6",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "Standard_DC8es_v6",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "Standard_DC8ds_v3",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": true,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel SGX"
        }
      },
      {
        "name": "Standard_DC8s_v3",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": true,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel SGX"
        }
      },
      {
        "name": "Standard_DC16ads_cc_v5",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC16ads_v5",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC16ads_v6",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC16as_cc_v5",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC16as_v5",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC16as_v6",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC16eds_v6",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "Standard_DC16es_v6",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "Standard_DC16ds_v3",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": true,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel SGX"
        }
      },
      {
        "name": "Standard_DC16s_v3",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": true,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel SGX"
        }
      },
      {
        "name": "Standard_DC24ds_v3",
        "vcpus": 24,
        "ramGib": 192,
        "sgxEnabled": true,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel SGX"
        }
      },
      {
        "name": "Standard_DC24s_v3",
        "vcpus": 24,
        "ramGib": 192,
        "sgxEnabled": true,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel SGX"
        }
      },
      {
        "name": "Standard_DC32ads_cc_v5",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC32ads_v5",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC32ads_v6",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC32as_cc_v5",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC32as_v5",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC32as_v6",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC32eds_v6",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "Standard_DC32es_v6",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "Standard_DC32ds_v3",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": true,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel SGX"
        }
      },
      {
        "name": "Standard_DC32s_v3",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": true,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel SGX"
        }
      },
      {
        "name": "Standard_DC48ads_cc_v5",
        "vcpus": 48,
        "ramGib": 192,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC48ads_v5",
        "vcpus": 48,
        "ramGib": 192,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC48as_cc_v5",
        "vcpus": 48,
        "ramGib": 192,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC48as_v5",
        "vcpus": 48,
        "ramGib": 192,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC48ds_v3",
        "vcpus": 48,
        "ramGib": 384,
        "sgxEnabled": true,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel SGX"
        }
      },
      {
        "name": "Standard_DC48s_v3",
        "vcpus": 48,
        "ramGib": 384,
        "sgxEnabled": true,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel SGX"
        }
      },
      {
        "name": "Standard_DC64ads_cc_v5",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC64ads_v5",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC64ads_v6",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC64as_cc_v5",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC64as_v5",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC64as_v6",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC64eds_v6",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "Standard_DC64es_v6",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "Standard_DC96ads_cc_v5",
        "vcpus": 96,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC96ads_v5",
        "vcpus": 96,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC96ads_v6",
        "vcpus": 96,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC96as_cc_v5",
        "vcpus": 96,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC96as_v5",
        "vcpus": 96,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC96as_v6",
        "vcpus": 96,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_DC96eds_v6",
        "vcpus": 96,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "Standard_DC96es_v6",
        "vcpus": 96,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "Standard_DC128eds_v6",
        "vcpus": 128,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "Standard_DC128es_v6",
        "vcpus": 128,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      }
    ],
    "E": [
      {
        "name": "Standard_E2ads_v7",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E2as_v5",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E2as_v7",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E2ds_v7",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E2s_v5",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E2s_v7",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_EC2ads_v5",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC2ads_v6",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC2as_v5",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC2as_v6",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_E4ads_v7",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E4as_v5",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E4as_v7",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E4ds_v7",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E4s_v5",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E4s_v7",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_EC4ads_cc_v5",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC4ads_v5",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC4ads_v6",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC4as_cc_v5",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC4as_v5",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC4as_v6",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_E8ads_v7",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E8as_v5",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E8as_v7",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E8ds_v7",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E8s_v5",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E8s_v7",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_EC8ads_cc_v5",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC8ads_v5",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC8as_cc_v5",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC8as_v5",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_E16ads_v7",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E16as_v5",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E16as_v7",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E16ds_v7",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E16s_v5",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E16s_v7",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_EC16ads_cc_v5",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC16ads_v5",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC16ads_v6",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC16as_cc_v5",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC16as_v5",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC16as_v6",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC20ads_cc_v5",
        "vcpus": 20,
        "ramGib": 160,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC20as_cc_v5",
        "vcpus": 20,
        "ramGib": 160,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_E32ads_v7",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E32as_v5",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E32as_v7",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E32ds_v7",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E32s_v5",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E32s_v7",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_EC32ads_cc_v5",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC32ads_v5",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC32ads_v6",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC32as_cc_v5",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC32as_v5",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC32as_v6",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC48ads_v5",
        "vcpus": 48,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC48ads_v6",
        "vcpus": 48,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC48as_v5",
        "vcpus": 48,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC48as_v6",
        "vcpus": 48,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_E64ads_v7",
        "vcpus": 64,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E64as_v5",
        "vcpus": 64,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E64as_v7",
        "vcpus": 64,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E64ds_v7",
        "vcpus": 64,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E64s_v5",
        "vcpus": 64,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E64s_v7",
        "vcpus": 64,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_EC64ads_cc_v5",
        "vcpus": 64,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC64ads_v5",
        "vcpus": 64,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC64ads_v6",
        "vcpus": 64,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC64as_cc_v5",
        "vcpus": 64,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC64as_v5",
        "vcpus": 64,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC64as_v6",
        "vcpus": 64,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC96ads_cc_v5",
        "vcpus": 96,
        "ramGib": 672,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC96ads_v5",
        "vcpus": 96,
        "ramGib": 672,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC96ads_v6",
        "vcpus": 96,
        "ramGib": 672,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC96as_cc_v5",
        "vcpus": 96,
        "ramGib": 672,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC96as_v5",
        "vcpus": 96,
        "ramGib": 672,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_EC96as_v6",
        "vcpus": 96,
        "ramGib": 672,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_E128ads_v7",
        "vcpus": 128,
        "ramGib": 1024,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E128as_v7",
        "vcpus": 128,
        "ramGib": 1024,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E128ds_v7",
        "vcpus": 128,
        "ramGib": 1024,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E128s_v7",
        "vcpus": 128,
        "ramGib": 1024,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E160ads_v7",
        "vcpus": 160,
        "ramGib": 1280,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E160as_v7",
        "vcpus": 160,
        "ramGib": 1280,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E372ids_v7",
        "vcpus": 372,
        "ramGib": 2832,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_E372is_v7",
        "vcpus": 372,
        "ramGib": 2832,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ],
    "F": [
      {
        "name": "Standard_F1ads_v7",
        "vcpus": 1,
        "ramGib": 4,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F1as_v7",
        "vcpus": 1,
        "ramGib": 4,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F2s_v2",
        "vcpus": 2,
        "ramGib": 4,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F2ads_v7",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F2as_v7",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F4s_v2",
        "vcpus": 4,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F4ads_v7",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F4as_v7",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F8s_v2",
        "vcpus": 8,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F8ads_v7",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F8as_v7",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F16s_v2",
        "vcpus": 16,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F16ads_v7",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F16as_v7",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F32s_v2",
        "vcpus": 32,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F32ads_v7",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F32as_v7",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F64s_v2",
        "vcpus": 64,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F64ads_v7",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F64as_v7",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F72s_v2",
        "vcpus": 72,
        "ramGib": 144,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F80ads_v7",
        "vcpus": 80,
        "ramGib": 320,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_F80as_v7",
        "vcpus": 80,
        "ramGib": 320,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ],
    "H": [
      {
        "name": "Standard_HC44-16rs",
        "vcpus": 16,
        "ramGib": 352,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB120-16rs_v3",
        "vcpus": 16,
        "ramGib": 448,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB176-24rs_v4",
        "vcpus": 24,
        "ramGib": 768,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HX176-24rs",
        "vcpus": 24,
        "ramGib": 1408,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HC44-32rs",
        "vcpus": 32,
        "ramGib": 352,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB120-32rs_v3",
        "vcpus": 32,
        "ramGib": 448,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HC44rs",
        "vcpus": 44,
        "ramGib": 352,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB368-48rs_v5",
        "vcpus": 48,
        "ramGib": 432,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB176-48rs_v4",
        "vcpus": 48,
        "ramGib": 768,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HX176-48rs",
        "vcpus": 48,
        "ramGib": 1408,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB120-64rs_v3",
        "vcpus": 64,
        "ramGib": 448,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB368-96rs_v5",
        "vcpus": 96,
        "ramGib": 432,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB120-96rs_v3",
        "vcpus": 96,
        "ramGib": 448,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB176-96rs_v4",
        "vcpus": 96,
        "ramGib": 768,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HX176-96rs",
        "vcpus": 96,
        "ramGib": 1408,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB120rs_v3",
        "vcpus": 120,
        "ramGib": 448,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB368-144rs_v5",
        "vcpus": 144,
        "ramGib": 432,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB176-144rs_v4",
        "vcpus": 144,
        "ramGib": 768,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HX176-144rs",
        "vcpus": 144,
        "ramGib": 1408,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB176rs_v4",
        "vcpus": 176,
        "ramGib": 768,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HX176rs",
        "vcpus": 176,
        "ramGib": 1408,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB368-192rs_v5",
        "vcpus": 192,
        "ramGib": 432,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB368-240rs_v5",
        "vcpus": 240,
        "ramGib": 432,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB368-288rs_v5",
        "vcpus": 288,
        "ramGib": 432,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB368-336rs_v5",
        "vcpus": 336,
        "ramGib": 432,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_HB368rs_v5",
        "vcpus": 368,
        "ramGib": 432,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ],
    "L": [
      {
        "name": "Standard_L2s_v4",
        "vcpus": 2,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_L4s_v4",
        "vcpus": 4,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_L8s_v3",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_L8s_v4",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_L16s_v3",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_L16s_v4",
        "vcpus": 16,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_L32s_v3",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_L32s_v4",
        "vcpus": 32,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_L48s_v3",
        "vcpus": 48,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_L48s_v4",
        "vcpus": 48,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_L64s_v3",
        "vcpus": 64,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_L64s_v4",
        "vcpus": 64,
        "ramGib": 512,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_L80s_v3",
        "vcpus": 80,
        "ramGib": 640,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_L96s_v4",
        "vcpus": 96,
        "ramGib": 768,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ],
    "M": [
      {
        "name": "Standard_M8ms",
        "vcpus": 8,
        "ramGib": 218.75,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_M16ms",
        "vcpus": 16,
        "ramGib": 437.5,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_M32ms",
        "vcpus": 32,
        "ramGib": 875,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_M64ms",
        "vcpus": 64,
        "ramGib": 1792,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_M128s",
        "vcpus": 128,
        "ramGib": 2048,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_M128ms",
        "vcpus": 128,
        "ramGib": 3892,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ],
    "N": [
      {
        "name": "Standard_NV6ads_A10_v5",
        "vcpus": 6,
        "ramGib": 55,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_NP10s",
        "vcpus": 10,
        "ramGib": 168,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_NV12ads_A10_v5",
        "vcpus": 12,
        "ramGib": 110,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_NV18ads_A10_v5",
        "vcpus": 18,
        "ramGib": 220,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_NP20s",
        "vcpus": 20,
        "ramGib": 336,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_NC24ads_A100_v4",
        "vcpus": 24,
        "ramGib": 220,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_NV36ads_A10_v5",
        "vcpus": 36,
        "ramGib": 440,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_NC40ads_H100_v5",
        "vcpus": 40,
        "ramGib": 320,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_NCC40ads_H100_v5",
        "vcpus": 40,
        "ramGib": 320,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV-SNP"
        }
      },
      {
        "name": "Standard_NP40s",
        "vcpus": 40,
        "ramGib": 672,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_NC48ads_A100_v4",
        "vcpus": 48,
        "ramGib": 440,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_NV72ads_A10_v5",
        "vcpus": 72,
        "ramGib": 880,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_NC80adis_H100_v5",
        "vcpus": 80,
        "ramGib": 640,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "Standard_NC96ads_A100_v4",
        "vcpus": 96,
        "ramGib": 880,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ]
  },
  "gcp": {
    "E": [
      {
        "name": "e2-micro",
        "vcpus": 2,
        "ramGib": 1,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "e2-small",
        "vcpus": 2,
        "ramGib": 2,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "e2-medium",
        "vcpus": 2,
        "ramGib": 4,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "e2-standard-2",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "e2-standard-4",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "e2-standard-8",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "e2-standard-16",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "e2-standard-32",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ],
    "N": [
      {
        "name": "n2-standard-2",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "n2d-standard-2",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV / AMD SEV-SNP"
        }
      },
      {
        "name": "n2-standard-4",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "n2d-standard-4",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV / AMD SEV-SNP"
        }
      },
      {
        "name": "n4-standard-4",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "n2-standard-8",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "n2d-standard-8",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV / AMD SEV-SNP"
        }
      },
      {
        "name": "n4-standard-8",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "n2-standard-16",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "n2d-standard-16",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV / AMD SEV-SNP"
        }
      },
      {
        "name": "n4-standard-16",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "n2-standard-32",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "n2d-standard-32",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV / AMD SEV-SNP"
        }
      },
      {
        "name": "n4-standard-32",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "n2-standard-64",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "n2d-standard-64",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV / AMD SEV-SNP"
        }
      },
      {
        "name": "n4-standard-64",
        "vcpus": 64,
        "ramGib": 256,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "n2-standard-96",
        "vcpus": 96,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "n2d-standard-96",
        "vcpus": 96,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV / AMD SEV-SNP"
        }
      },
      {
        "name": "n4-standard-96",
        "vcpus": 96,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ],
    "C": [
      {
        "name": "c4d-standard-2",
        "vcpus": 2,
        "ramGib": 7,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV"
        }
      },
      {
        "name": "c4-standard-2",
        "vcpus": 2,
        "ramGib": 7.5,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX (Preview)"
        }
      },
      {
        "name": "c2d-standard-2",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV"
        }
      },
      {
        "name": "c4a-standard-2",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "c4-standard-4",
        "vcpus": 4,
        "ramGib": 15,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX (Preview)"
        }
      },
      {
        "name": "c4d-standard-4",
        "vcpus": 4,
        "ramGib": 15,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV"
        }
      },
      {
        "name": "c2-standard-4",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "c2d-standard-4",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV"
        }
      },
      {
        "name": "c3-standard-4",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "c4a-standard-4",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "c4-standard-8",
        "vcpus": 8,
        "ramGib": 30,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX (Preview)"
        }
      },
      {
        "name": "c4d-standard-8",
        "vcpus": 8,
        "ramGib": 31,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV"
        }
      },
      {
        "name": "c2-standard-8",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "c2d-standard-8",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV"
        }
      },
      {
        "name": "c3-standard-8",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "c4a-standard-8",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "c4-standard-16",
        "vcpus": 16,
        "ramGib": 60,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX (Preview)"
        }
      },
      {
        "name": "c4d-standard-16",
        "vcpus": 16,
        "ramGib": 62,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV"
        }
      },
      {
        "name": "c2-standard-16",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "c2d-standard-16",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV"
        }
      },
      {
        "name": "c4a-standard-16",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "c3-standard-22",
        "vcpus": 22,
        "ramGib": 88,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "c2-standard-30",
        "vcpus": 30,
        "ramGib": 120,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "c4-standard-32",
        "vcpus": 32,
        "ramGib": 120,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX (Preview)"
        }
      },
      {
        "name": "c4d-standard-32",
        "vcpus": 32,
        "ramGib": 124,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV"
        }
      },
      {
        "name": "c2d-standard-32",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV"
        }
      },
      {
        "name": "c4a-standard-32",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "c3-standard-44",
        "vcpus": 44,
        "ramGib": 176,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "c2d-standard-56",
        "vcpus": 56,
        "ramGib": 224,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV"
        }
      },
      {
        "name": "c2-standard-60",
        "vcpus": 60,
        "ramGib": 240,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "c4a-standard-72",
        "vcpus": 72,
        "ramGib": 288,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "c3-standard-88",
        "vcpus": 88,
        "ramGib": 352,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "c4-standard-96",
        "vcpus": 96,
        "ramGib": 360,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX (Preview)"
        }
      },
      {
        "name": "c4d-standard-96",
        "vcpus": 96,
        "ramGib": 372,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV"
        }
      },
      {
        "name": "c2d-standard-112",
        "vcpus": 112,
        "ramGib": 448,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV"
        }
      },
      {
        "name": "c3-standard-176",
        "vcpus": 176,
        "ramGib": 704,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX"
        }
      },
      {
        "name": "c4-standard-192",
        "vcpus": 192,
        "ramGib": 720,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "Intel TDX (Preview)"
        }
      },
      {
        "name": "c4d-standard-192",
        "vcpus": 192,
        "ramGib": 744,
        "sgxEnabled": false,
        "confidentialComputing": {
          "supported": true,
          "technology": "AMD SEV"
        }
      }
    ],
    "M": [
      {
        "name": "m4-megamem-28",
        "vcpus": 28,
        "ramGib": 372,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m3-ultramem-32",
        "vcpus": 32,
        "ramGib": 976,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m1-ultramem-40",
        "vcpus": 40,
        "ramGib": 961,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m4-megamem-56",
        "vcpus": 56,
        "ramGib": 744,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m4-ultramem-56",
        "vcpus": 56,
        "ramGib": 1488,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m3-megamem-64",
        "vcpus": 64,
        "ramGib": 976,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m3-ultramem-64",
        "vcpus": 64,
        "ramGib": 1952,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m1-ultramem-80",
        "vcpus": 80,
        "ramGib": 1922,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m1-megamem-96",
        "vcpus": 96,
        "ramGib": 1433.6,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m4-megamem-112",
        "vcpus": 112,
        "ramGib": 1488,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m4-ultramem-112",
        "vcpus": 112,
        "ramGib": 2976,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m3-megamem-128",
        "vcpus": 128,
        "ramGib": 1952,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m3-ultramem-128",
        "vcpus": 128,
        "ramGib": 3904,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m1-ultramem-160",
        "vcpus": 160,
        "ramGib": 3844,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m2-ultramem-208",
        "vcpus": 208,
        "ramGib": 5888,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m4-megamem-224",
        "vcpus": 224,
        "ramGib": 2976,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m4-ultramem-224",
        "vcpus": 224,
        "ramGib": 5952,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m2-megamem-416",
        "vcpus": 416,
        "ramGib": 5888,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "m2-ultramem-416",
        "vcpus": 416,
        "ramGib": 11776,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ],
    "A": [
      {
        "name": "a2-highgpu-1g",
        "vcpus": 12,
        "ramGib": 85,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "a2-highgpu-2g",
        "vcpus": 24,
        "ramGib": 170,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "a3-highgpu-1g",
        "vcpus": 26,
        "ramGib": 234,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "a2-highgpu-4g",
        "vcpus": 48,
        "ramGib": 340,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "a3-highgpu-2g",
        "vcpus": 52,
        "ramGib": 468,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "a2-highgpu-8g",
        "vcpus": 96,
        "ramGib": 680,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "a2-megagpu-16g",
        "vcpus": 96,
        "ramGib": 1360,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "a3-highgpu-4g",
        "vcpus": 104,
        "ramGib": 936,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "a3-highgpu-8g",
        "vcpus": 208,
        "ramGib": 1872,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "a4-highgpu-8g",
        "vcpus": 224,
        "ramGib": 3968,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ],
    "G": [
      {
        "name": "g2-standard-4",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "g2-standard-8",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "g2-standard-16",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "g2-standard-24",
        "vcpus": 24,
        "ramGib": 96,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "g2-standard-48",
        "vcpus": 48,
        "ramGib": 192,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "g2-standard-96",
        "vcpus": 96,
        "ramGib": 384,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ],
    "Z": [
      {
        "name": "z3-highmem-8-highlssd",
        "vcpus": 8,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "z3-highmem-14-standardlssd",
        "vcpus": 14,
        "ramGib": 112,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "z3-highmem-88-standardlssd",
        "vcpus": 88,
        "ramGib": 704,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "z3-highmem-176-standardlssd",
        "vcpus": 176,
        "ramGib": 1406,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "z3-highmem-192-highlssd-metal",
        "vcpus": 192,
        "ramGib": 1536,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ],
    "T": [
      {
        "name": "t2a-standard-1",
        "vcpus": 1,
        "ramGib": 4,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "t2d-standard-1",
        "vcpus": 1,
        "ramGib": 4,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "t2a-standard-2",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "t2d-standard-2",
        "vcpus": 2,
        "ramGib": 8,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "t2a-standard-4",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "t2d-standard-4",
        "vcpus": 4,
        "ramGib": 16,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "t2a-standard-8",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "t2d-standard-8",
        "vcpus": 8,
        "ramGib": 32,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "t2a-standard-16",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "t2d-standard-16",
        "vcpus": 16,
        "ramGib": 64,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "t2a-standard-32",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "t2d-standard-32",
        "vcpus": 32,
        "ramGib": 128,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "t2a-standard-48",
        "vcpus": 48,
        "ramGib": 192,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "t2d-standard-48",
        "vcpus": 48,
        "ramGib": 192,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "t2d-standard-60",
        "vcpus": 60,
        "ramGib": 240,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ],
    "X": [
      {
        "name": "x4-480-6t-metal",
        "vcpus": 480,
        "ramGib": 6144,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "x4-480-8t-metal",
        "vcpus": 480,
        "ramGib": 8192,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "x4-960-12t-metal",
        "vcpus": 960,
        "ramGib": 12288,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "x4-960-16t-metal",
        "vcpus": 960,
        "ramGib": 16384,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "x4-1440-24t-metal",
        "vcpus": 1440,
        "ramGib": 24576,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "x4-1920-32t-metal",
        "vcpus": 1920,
        "ramGib": 32768,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ],
    "H": [
      {
        "name": "h4d-standard-192",
        "vcpus": 192,
        "ramGib": 720,
        "sgxEnabled": false,
        "confidentialComputing": null
      },
      {
        "name": "h4d-highmem-192",
        "vcpus": 192,
        "ramGib": 1488,
        "sgxEnabled": false,
        "confidentialComputing": null
      }
    ]
  }
};

export function getClassesForProvider(provider) {
  return Object.keys(INSTANCE_SIZES[provider] || {});
}

export function getSizesForClass(provider, className) {
  return INSTANCE_SIZES[provider]?.[className] || [];
}

export function getSizeByName(provider, className, sizeName) {
  return getSizesForClass(provider, className).find(s => s.name === sizeName) || null;
}
