using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class openDoorAnim : MonoBehaviour
{
    private bool doorIsOpen;
    public GameObject doorHinge;
    private int rotation;

    // Start is called before the first frame update
    void Start()
    {
        doorIsOpen = true;
    }

    // Update is called once per frame
    void Update()
    {
        doorHinge.GetComponent<Transform>();

        // animation idk does not work??
        openDoorWithAnimation();

        // skip door animation
        //openDoorWithoutAnimation();

    }

    private void OnCollisionEnter(Collision collision)
    {
        if (collision.gameObject.CompareTag("Player"))
        {
            if (rotation == 90) {
                doorIsOpen = true;
            }
            else {
                doorIsOpen = false;
            }
        }
    }

    void openDoorWithAnimation() 
    {
        if (doorIsOpen == false)
        {
            rotation = 90;
            doorHinge.transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.Euler(0, rotation, 0), 2 * Time.deltaTime);
        }
        else
        {
            rotation = 0;
            doorHinge.transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.Euler(0, rotation, 0), 2 * Time.deltaTime);
        }
    }

    void openDoorWithoutAnimation()
    {
        if (Input.GetKeyDown(KeyCode.E))
        {
            if (doorIsOpen == false)
            {
                rotation = 90;
                doorHinge.transform.rotation = Quaternion.Euler(0, rotation, 0);
            }
            else
            {
                rotation = 0;
                doorHinge.transform.rotation = Quaternion.Euler(0, rotation, 0);
            }
        }
    }
}
