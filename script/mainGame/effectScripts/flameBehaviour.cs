using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class flameBehaviour : MonoBehaviour
{

    public Camera mCamera;
    // Start is called before the first frame update
    void Start()
    {
        
    }

    private void Awake()
    {
        mCamera = Camera.main;
    }

    // Update is called once per frame
    void Update()
    {
        transform.LookAt(mCamera.transform.position, Vector3.up);
    }
}
