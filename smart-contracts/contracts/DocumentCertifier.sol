// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DocumentCertifier {
    struct DocumentRecord {
        string ipfsHash;
        address owner;
        uint256 timestamp;
        bool exists;
    }
    
    mapping(uint256 => DocumentRecord) public documents;
    mapping(address => uint256[]) public userDocuments;
    uint256 public documentCount;
    
    event DocumentCertified(uint256 indexed documentId, address indexed owner, string ipfsHash, uint256 timestamp);
    event DocumentTransferred(uint256 indexed documentId, address indexed from, address indexed to, uint256 timestamp);
    
    function certifyDocument(string memory _ipfsHash) public returns (uint256) {
        require(bytes(_ipfsHash).length > 0, "Hash IPFS vide");
        
        documentCount++;
        uint256 newDocId = documentCount;
        
        documents[newDocId] = DocumentRecord({
            ipfsHash: _ipfsHash,
            owner: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });
        
        userDocuments[msg.sender].push(newDocId);
        
        emit DocumentCertified(newDocId, msg.sender, _ipfsHash, block.timestamp);
        
        return newDocId;
    }
    
    function verifyDocument(uint256 _documentId) public view returns (string memory ipfsHash, address owner, uint256 timestamp, bool exists) {
        DocumentRecord memory doc = documents[_documentId];
        return (doc.ipfsHash, doc.owner, doc.timestamp, doc.exists);
    }
    
    function getUserDocuments(address _owner) public view returns (uint256[] memory) {
        return userDocuments[_owner];
    }
    
    function transferDocument(uint256 _documentId, address _newOwner) public {
        require(documents[_documentId].exists, "Document inexistant");
        require(documents[_documentId].owner == msg.sender, "Vous n'etes pas le proprietaire");
        require(_newOwner != address(0), "Adresse invalide");
        
        address oldOwner = documents[_documentId].owner;
        documents[_documentId].owner = _newOwner;
        
        userDocuments[_newOwner].push(_documentId);
        
        emit DocumentTransferred(_documentId, oldOwner, _newOwner, block.timestamp);
    }
    
    function checkHashExists(string memory _ipfsHash) public view returns (bool exists, uint256 documentId) {
        for (uint256 i = 1; i <= documentCount; i++) {
            if (keccak256(bytes(documents[i].ipfsHash)) == keccak256(bytes(_ipfsHash))) {
                return (true, i);
            }
        }
        return (false, 0);
    }
}

